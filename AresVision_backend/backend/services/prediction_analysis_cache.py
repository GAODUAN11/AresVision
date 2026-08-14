from __future__ import annotations

import gzip
import hashlib
import inspect
import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from config import MCD_DIR, OPENMARS_DIR
from database.engine import async_session_maker
from database.models import PredictionAnalysisCache
from sqlalchemy import select, update


CACHE_SCHEMA_VERSION = 1
SUPPORTED_ANALYSIS_TYPES = {
    "prediction",
    "metrics",
    "error_distribution",
    "pfi",
}


class CachePayloadError(ValueError):
    pass


def _canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _variables(values: list[str] | None) -> list[str]:
    return sorted(
        {str(value).strip() for value in values or [] if str(value).strip()}
    )


def normalize_request(
    analysis_type: str, params: dict[str, Any]
) -> dict[str, Any]:
    if analysis_type not in SUPPORTED_ANALYSIS_TYPES:
        raise ValueError(
            f"Unsupported prediction analysis type: {analysis_type}"
        )

    horizon = int(params["horizon"])
    if analysis_type == "prediction":
        return {
            "horizon": horizon,
            "ls_start": float(params["ls_start"]),
            "mars_year": int(params["mars_year"]),
        }
    if analysis_type in {"metrics", "error_distribution"}:
        return {"horizon": horizon}
    return {
        "horizon": horizon,
        "selected_variables": _variables(params.get("selected_variables")),
    }


def build_request_hash(
    analysis_type: str, params: dict[str, Any]
) -> str:
    normalized = normalize_request(analysis_type, params)
    return hashlib.sha256(_canonical_json(normalized)).hexdigest()


def _file_signature(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "name": path.name,
        "size": stat.st_size,
        "mtime_ns": stat.st_mtime_ns,
    }


def _dataset_manifest(root: Path) -> list[dict[str, Any]]:
    paths = sorted(root.glob("*.nc"), key=lambda item: item.name.lower())
    return [_file_signature(path) for path in paths]


def build_artifact_fingerprint(
    task,
    data_dirs=None,
    *,
    schema_version=CACHE_SCHEMA_VERSION,
) -> str:
    data_dirs = data_dirs or {}
    model_path = Path(task.output_model_path).expanduser().resolve()
    openmars_dir = Path(
        data_dirs.get("ARESVISION_OPENMARS_DIR") or OPENMARS_DIR
    ).expanduser().resolve()
    mcd_dir = Path(
        data_dirs.get("ARESVISION_MCD_DIR") or MCD_DIR
    ).expanduser().resolve()

    try:
        hyperparameters = json.loads(task.hyperparameters or "{}")
    except (TypeError, json.JSONDecodeError):
        hyperparameters = {}

    identity = {
        "schema_version": int(schema_version),
        "task_id": int(task.id),
        "model_source": str(
            getattr(task, "model_source", "official") or "official"
        ),
        "uploaded_model_id": getattr(task, "uploaded_model_id", None),
        "uploaded_model_version": getattr(
            task, "uploaded_model_version", None
        ),
        "hyperparameters": hyperparameters,
        "model": _file_signature(model_path),
        "openmars": _dataset_manifest(openmars_dir),
        "mcd": _dataset_manifest(mcd_dir),
    }
    return hashlib.sha256(_canonical_json(identity)).hexdigest()


def _validate_result(
    analysis_type: str, result: Any
) -> dict[str, Any]:
    required = {
        "prediction": {
            "ground_truth",
            "prediction",
            "residual",
            "horizon",
            "model_info",
        },
        "metrics": {"overall", "per_step"},
        "error_distribution": {
            "scatter",
            "hist_trues",
            "hist_preds",
            "hist_errors",
            "mae",
            "rmse",
        },
        "pfi": {"items", "baseline_metric", "baseline_value"},
    }[analysis_type]
    if not isinstance(result, dict) or not required.issubset(result):
        raise CachePayloadError(
            f"Invalid {analysis_type} cache payload"
        )
    return result


def encode_payload(
    analysis_type: str, result: dict[str, Any]
) -> bytes:
    envelope = {
        "analysis_type": analysis_type,
        "payload": _validate_result(analysis_type, result),
        "schema_version": CACHE_SCHEMA_VERSION,
    }
    return gzip.compress(_canonical_json(envelope), mtime=0)


def decode_payload(
    analysis_type: str, payload: bytes
) -> dict[str, Any]:
    try:
        envelope = json.loads(gzip.decompress(payload))
    except Exception as exc:
        raise CachePayloadError(
            "Invalid compressed cache payload"
        ) from exc

    if envelope.get("schema_version") != CACHE_SCHEMA_VERSION:
        raise CachePayloadError("Cache schema version mismatch")
    if envelope.get("analysis_type") != analysis_type:
        raise CachePayloadError("Cache analysis type mismatch")
    return _validate_result(analysis_type, envelope.get("payload"))


class PredictionAnalysisCacheService:
    def __init__(
        self,
        sessionmaker=async_session_maker,
        *,
        lease_seconds=1800.0,
        poll_seconds=0.05,
    ):
        self.sessionmaker = sessionmaker
        self.lease_seconds = float(lease_seconds)
        self.poll_seconds = float(poll_seconds)

    async def get_or_compute(
        self,
        *,
        user_id: int,
        task,
        analysis_type: str,
        request_params: dict[str, Any],
        data_dirs: dict[str, str] | None,
        compute,
    ) -> dict[str, Any]:
        if not user_id:
            raise PermissionError(
                "Authentication is required for trained-model analysis"
            )

        request_hash = build_request_hash(
            analysis_type, request_params
        )
        fingerprint = build_artifact_fingerprint(task, data_dirs)
        ready = await self._read_ready(
            int(user_id),
            int(task.id),
            analysis_type,
            request_hash,
            fingerprint,
        )
        if ready is not None:
            return ready

        token = await self._insert_or_claim(
            int(user_id),
            int(task.id),
            analysis_type,
            request_hash,
            fingerprint,
        )
        result = compute()
        if inspect.isawaitable(result):
            result = await result
        await self._publish(token, encode_payload(analysis_type, result))
        return result

    async def _read_ready(
        self,
        user_id,
        task_id,
        analysis_type,
        request_hash,
        fingerprint,
    ):
        async with self.sessionmaker() as session:
            row = (
                await session.execute(
                    select(PredictionAnalysisCache).where(
                        PredictionAnalysisCache.user_id == user_id,
                        PredictionAnalysisCache.training_task_id == task_id,
                        PredictionAnalysisCache.analysis_type == analysis_type,
                        PredictionAnalysisCache.request_hash == request_hash,
                        PredictionAnalysisCache.artifact_fingerprint
                        == fingerprint,
                        PredictionAnalysisCache.status == "ready",
                    )
                )
            ).scalar_one_or_none()

        if row is None or row.payload is None:
            return None
        return decode_payload(analysis_type, row.payload)

    async def _insert_or_claim(
        self,
        user_id,
        task_id,
        analysis_type,
        request_hash,
        fingerprint,
    ):
        token = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        async with self.sessionmaker() as session:
            row = (
                await session.execute(
                    select(PredictionAnalysisCache).where(
                        PredictionAnalysisCache.user_id == user_id,
                        PredictionAnalysisCache.training_task_id == task_id,
                        PredictionAnalysisCache.analysis_type == analysis_type,
                        PredictionAnalysisCache.request_hash == request_hash,
                    )
                )
            ).scalar_one_or_none()
            if row is None:
                row = PredictionAnalysisCache(
                    user_id=user_id,
                    training_task_id=task_id,
                    analysis_type=analysis_type,
                    request_hash=request_hash,
                    artifact_fingerprint=fingerprint,
                )
                session.add(row)

            row.artifact_fingerprint = fingerprint
            row.status = "computing"
            row.payload = None
            row.lease_token = token
            row.lease_expires_at = now + timedelta(
                seconds=self.lease_seconds
            )
            row.last_error = None
            await session.commit()
        return token

    async def _publish(self, token, payload):
        async with self.sessionmaker() as session:
            result = await session.execute(
                update(PredictionAnalysisCache)
                .where(
                    PredictionAnalysisCache.lease_token == token,
                    PredictionAnalysisCache.status == "computing",
                )
                .values(
                    status="ready",
                    payload=payload,
                    lease_token=None,
                    lease_expires_at=None,
                    last_error=None,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            if result.rowcount != 1:
                await session.rollback()
                raise RuntimeError(
                    "Prediction analysis cache lease was lost"
                )
            await session.commit()
