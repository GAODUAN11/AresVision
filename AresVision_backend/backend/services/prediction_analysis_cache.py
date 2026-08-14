from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path
from typing import Any

from config import MCD_DIR, OPENMARS_DIR


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
