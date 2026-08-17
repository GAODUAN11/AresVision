"""
棰勬祴鍒嗘瀽椤?鈥?API 璺敱
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Query, Body

from auth.dependencies import get_optional_user
from database.models import User

from schemas.predict import (
    PredictRequest, PredictResponse,
    EvalMetricsResponse, AblationResponse, DiurnalResponse,
    PerformanceResponse, PerformanceCompareRequest, PerformanceCompareResponse,
    TrainingModelCompareRequest, TrainingModelCompareResponse,
    ErrorDistributionResponse, PermutationImportanceResponse,
)
from config import DEFAULT_MARS_YEAR, LATITUDE_BANDS
from services.analysis_service import AnalysisService
from services.predict_service import PredictOrchestratorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["棰勬祴鍒嗘瀽"])


def _get_predict_service(request: Request):
    return request.app.state.predict_service


def _get_analysis_service(request: Request):
    return request.app.state.analysis_service


def _get_training_inference_service(request: Request):
    service = getattr(request.app.state, "training_inference_service", None)
    if service is None:
        raise HTTPException(status_code=500, detail="training inference service unavailable")
    return service


def _require_trained_model_user(current_user: User | None) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication is required for trained-model analysis",
        )
    return current_user


def _normalize_predict_source(data_source: str | None) -> str:
    requested = (data_source or "default").strip().lower()
    if requested == "personal":
        raise HTTPException(
            status_code=400,
            detail="Personal raw uploads are only available in Data Overview; prediction uses server-managed datasets.",
        )
    if requested not in ("default",):
        raise HTTPException(status_code=400, detail="data_source must be 'default'")
    return "default"


async def _resolve_predict_context(
    request: Request,
    my: int,
    data_source: str,
    current_user: User | None,
) -> tuple[PredictOrchestratorService, dict, int]:
    _normalize_predict_source(data_source)
    return (
        _get_predict_service(request),
        {
            "requested_source": "default",
            "effective_source": "default",
            "fallback": False,
            "message": None,
            "mars_year": my,
        },
        my,
    )


async def _resolve_diurnal_context(
    request: Request,
    my: int,
    data_source: str,
    current_user: User | None,
) -> tuple[AnalysisService, dict, int]:
    _normalize_predict_source(data_source)
    return (
        _get_analysis_service(request),
        {
            "requested_source": "default",
            "effective_source": "default",
            "fallback": False,
            "message": None,
            "mars_year": my,
        },
        my,
    )


# 鈹€鈹€鈹€ 鏍稿績棰勬祴鎺ュ彛 鈹€鈹€鈹€

@router.post("/run", response_model=PredictResponse)
async def run_prediction(
    request: Request,
    body: PredictRequest = Body(...),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """
    鎵ц棰勬祴銆?
    鍓嶇浼犲叆鍕鹃€夌殑鍙橀噺鍒楄〃 + 棰勬祴姝ラ暱 + 璧峰 Ls銆?
    杩斿洖鐪熷€煎満銆侀娴嬪満銆佸樊鍊煎満銆?
    """
    try:
        if body.training_task_id:
            current_user = _require_trained_model_user(current_user)
            service = _get_training_inference_service(request)
            result = await service.predict_task(
                task_id=body.training_task_id,
                mars_year=body.mars_year,
                ls_start=body.ls_start,
                horizon=body.horizon,
                current_user=current_user,
                data_service=getattr(request.app.state, "data_service", None),
                personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
            )
            source_meta = result.get("source_meta") or {
                "requested_source": "training_task",
                "effective_source": "training_task",
                "fallback": False,
                "message": None,
                "mars_year": body.mars_year,
            }
            return {
                "ground_truth": result["ground_truth"],
                "prediction": result["prediction"],
                "residual": result["residual"],
                "selected_variables": result["selected_variables"],
                "horizon": result["horizon"],
                "ls_values": result["ls_values"],
                "model_info": result["model_info"],
                "metrics": result.get("metrics"),
                "source_meta": source_meta,
            }

        ps, source_meta, resolved_year = await _resolve_predict_context(
            request, body.mars_year, data_source, current_user
        )
        result = await asyncio.to_thread(ps.predict,
            mars_year=resolved_year,
            ls_start=body.ls_start,
            selected_variables=body.selected_variables,
            horizon=body.horizon,
            include_points=False,
        )
        return {
            "ground_truth": result["ground_truth"],
            "prediction": result["prediction"],
            "residual": result["residual"],
            "selected_variables": result["selected_variables"],
            "horizon": result["horizon"],
            "ls_values": result["ls_values"],
            "model_info": result["model_info"],
            "metrics": result.get("metrics"),
            "source_meta": source_meta,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"棰勬祴閿欒: {e}")


# 鈹€鈹€鈹€ 璇勪及鎸囨爣 鈹€鈹€鈹€

@router.post("/metrics", response_model=EvalMetricsResponse)
async def get_eval_metrics(
    request: Request,
    body: PredictRequest = Body(...),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """鑾峰彇棰勬祴璇勪及鎸囨爣锛圧MSE, MAE, SSIM, R虏锛?"""
    try:
        if body.training_task_id:
            current_user = _require_trained_model_user(current_user)
            service = _get_training_inference_service(request)
            metrics = await service.task_test_set_metrics(
                task_id=body.training_task_id,
                mars_year=body.mars_year,
                ls_start=body.ls_start,
                horizon=body.horizon,
                current_user=current_user,
                data_service=getattr(request.app.state, "data_service", None),
                personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
            )
            metrics = dict(metrics)
            metrics["source_meta"] = metrics.get("source_meta") or {
                "requested_source": "training_task",
                "effective_source": "training_task",
                "fallback": False,
                "message": None,
                "mars_year": body.mars_year,
            }
            return metrics

        ps, source_meta, resolved_year = await _resolve_predict_context(
            request, body.mars_year, data_source, current_user
        )
        result = await asyncio.to_thread(ps.predict,
            mars_year=resolved_year,
            ls_start=body.ls_start,
            selected_variables=body.selected_variables,
            horizon=body.horizon,
            include_points=False,
        )
        metrics = dict(result["metrics"])
        metrics["source_meta"] = source_meta
        return metrics
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("prediction metrics calculation failed")
        raise HTTPException(
            status_code=500,
            detail=f"prediction metrics error: {e}",
        )


@router.post("/training-models/compare", response_model=TrainingModelCompareResponse)
async def compare_training_models(
    request: Request,
    body: TrainingModelCompareRequest = Body(...),
    current_user: User | None = Depends(get_optional_user),
):
    """Compare completed training models using full test-set metrics."""
    try:
        current_user = _require_trained_model_user(current_user)
        service = _get_training_inference_service(request)
        return await service.compare_task_test_set_metrics(
            task_ids=body.task_ids,
            horizon=body.horizon,
            current_user=current_user,
            data_service=getattr(request.app.state, "data_service", None),
            personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise


@router.post("/training-models/compare-error-distribution")
async def compare_training_model_error_distributions(
    request: Request,
    body: TrainingModelCompareRequest = Body(...),
    current_user: User | None = Depends(get_optional_user),
):
    """Compare completed training models using full test-set error distributions."""
    try:
        current_user = _require_trained_model_user(current_user)
        service = _get_training_inference_service(request)
        return await service.compare_task_error_distributions(
            task_ids=body.task_ids,
            horizon=body.horizon,
            current_user=current_user,
            data_service=getattr(request.app.state, "data_service", None),
            personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise


@router.post("/training-models/compare-pfi")
async def compare_training_model_pfi(
    request: Request,
    body: TrainingModelCompareRequest = Body(...),
    current_user: User | None = Depends(get_optional_user),
):
    """Compare completed training models using full test-set permutation importance."""
    try:
        current_user = _require_trained_model_user(current_user)
        service = _get_training_inference_service(request)
        return await service.compare_task_permutation_importance(
            task_ids=body.task_ids,
            horizon=body.horizon,
            current_user=current_user,
            data_service=getattr(request.app.state, "data_service", None),
            personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise


@router.post("/prewarm")
async def prewarm_predict_source(
    request: Request,
    my: int = Query(DEFAULT_MARS_YEAR),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    try:
        requested = _normalize_predict_source(data_source)
        ps, source_meta, resolved_year = await _resolve_predict_context(
            request, my, requested, current_user
        )
        warmed = False
        ml_data_prep = getattr(ps, "ml_data_prep", None)
        if ml_data_prep is not None and hasattr(ml_data_prep, "prewarm_for_year"):
            await asyncio.to_thread(ml_data_prep.prewarm_for_year, resolved_year)
            warmed = True
        return {"ok": True, "warmed": warmed, "mars_year": resolved_year, "source_meta": source_meta}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"prewarm failed: {e}")


# 鈹€鈹€鈹€ 娑堣瀺瀹為獙 鈹€鈹€鈹€

@router.get("/ablation", response_model=AblationResponse)
async def get_ablation_results(
    request: Request,
    my: int = Query(DEFAULT_MARS_YEAR),
    ls: float = Query(90.0, ge=0, le=360),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """
    鑾峰彇娑堣瀺瀹為獙缁撴灉锛氫笉鍚屽彉閲忕粍鍚堢殑棰勬祴鏁堟灉瀵规瘮銆?
    娉ㄦ剰锛氭鎺ュ彛浼氳繍琛屽娆￠娴嬶紝棣栨璋冪敤鍙兘杈冩參銆?
    """
    try:
        ps, _source_meta, resolved_year = await _resolve_predict_context(
            request, my, data_source, current_user
        )
        items = await asyncio.to_thread(ps.get_ablation_results,
            mars_year=resolved_year,
            ls_start=ls,
        )
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"娑堣瀺瀹為獙閿欒: {e}")


# 鈹€鈹€鈹€ 鎬ц兘鏇茬嚎 (娴嬭瘯闆? 鈹€鈹€鈹€

@router.post("/performance", response_model=PerformanceResponse)
async def get_performance_results(
    request: Request,
    body: PredictRequest = Body(...),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """
    鑾峰彇妯″瀷鍦ㄦ祴璇曢泦涓婄殑 R2 鎬ц兘鏇茬嚎銆?
    妯酱涓?Ls锛岀旱杞翠负绌洪棿 R2 鍧囧€笺€?
    """
    try:
        ps, source_meta, resolved_year = await _resolve_predict_context(
            request, body.mars_year, data_source, current_user
        )
        if resolved_year != body.mars_year:
            logger.info(
                "performance request MY%s resolved to MY%s for source=%s",
                body.mars_year,
                resolved_year,
                data_source,
            )
        result = await asyncio.to_thread(ps.get_performance_curve,
            selected_variables=body.selected_variables,
        )
        if isinstance(result, dict):
            result["source_meta"] = source_meta
        return result
    except Exception as e:
        logger.error(f"鎬ц兘鏇茬嚎鎺ュ彛閿欒: {e}")
        raise HTTPException(status_code=500, detail=f"鎬ц兘鏇茬嚎璁＄畻澶辫触: {e}")


@router.post("/performance-compare", response_model=PerformanceCompareResponse)
async def get_performance_comparison(
    request: Request,
    body: PerformanceCompareRequest = Body(...),
    my: int = Query(DEFAULT_MARS_YEAR),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """鍚屾椂鑾峰彇澶氫釜鍙橀噺缁勫悎鐨勬ā鍨嬫€ц兘鏇茬嚎浠ヤ究瀵规瘮鍒嗘瀽"""
    try:
        ps, source_meta, resolved_year = await _resolve_predict_context(
            request, my, data_source, current_user
        )
        if resolved_year != my:
            logger.info(
                "performance-compare request MY%s resolved to MY%s for source=%s",
                my,
                resolved_year,
                data_source,
            )
        results = {}
        for vars_list in body.configs:
            # 浣跨敤鍒楄〃鍐呭浣滀负 key
            if not vars_list:
                key = "baseline"
            else:
                from config import VARIABLE_SHORTHANDS
                key = "".join([VARIABLE_SHORTHANDS.get(v, v[0]) for v in sorted(vars_list)])
            
            perf = await asyncio.to_thread(ps.get_performance_curve,
                selected_variables=vars_list,
            )
            results[key] = perf
        return {"results": results, "source_meta": source_meta}
    except Exception as e:
        logger.error(f"澶氭ā鍨嬪姣旀帴鍙ｉ敊璇? {e}")
        raise HTTPException(status_code=500, detail=f"瀵规瘮鏁版嵁鐢熸垚澶辫触: {e}")


# 鈹€鈹€鈹€ 鏄煎鍙樺寲 鈹€鈹€鈹€

@router.get("/diurnal", response_model=DiurnalResponse)
async def get_diurnal_data(
    request: Request,
    my: int = Query(DEFAULT_MARS_YEAR),
    ls: float = Query(90.0, ge=0, le=360),
    lat_band: str = Query("Equatorial (30S-30N)", description="纬度带名称"),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    """获取指定纬度带的臭氧昼夜变化曲线"""
    try:
        vs, source_meta, resolved_year = await _resolve_diurnal_context(
            request, my, data_source, current_user
        )
        result = vs.get_diurnal_data(resolved_year, ls, lat_band)
        result["source_meta"] = source_meta
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 鈹€鈹€鈹€ 妯″瀷淇℃伅 鈹€鈹€鈹€

@router.get("/model-info")
async def get_model_info(request: Request):
    """鑾峰彇妯″瀷鍩烘湰淇℃伅"""
    ps = _get_predict_service(request)
    inference = request.app.state.predict_inference
    return {
        "model_name": "PredRNNv2",
        "device": str(inference.device),
        "total_channels": 7,
        "input_window": 3,
        "pred_horizon": 3,
        "model_loaded": inference.model is not None,
        "available_bands": [b["name"] for b in LATITUDE_BANDS],
    }


@router.get("/error-distribution", response_model=ErrorDistributionResponse)
async def get_error_distribution(
    request: Request,
    vars: str = Query("Temperature,Dust_Optical_Depth,Solar_Flux_DN,U_Wind,V_Wind"),
    training_task_id: int | None = Query(None, ge=1),
    horizon: int = Query(3, ge=1, le=30),
    current_user: User | None = Depends(get_optional_user),
):
    """鑾峰彇鏁翠釜娴嬭瘯闆嗕笂鐨勮宸垎甯冦€佹牳瀵嗗害鏁ｇ偣鍙婃煴鐘跺浘鏁版嵁"""
    try:
        selected_variables = [v.strip() for v in vars.split(",") if v.strip()]
        if training_task_id:
            current_user = _require_trained_model_user(current_user)
            service = _get_training_inference_service(request)
            return await service.task_error_distribution(
                task_id=training_task_id,
                selected_variables=selected_variables,
                horizon=horizon,
                current_user=current_user,
                data_service=getattr(request.app.state, "data_service", None),
                personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
            )
        ps = _get_predict_service(request)
        return await asyncio.to_thread(ps.get_error_distribution,
            selected_variables=selected_variables,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"璇樊鍒嗗竷璁＄畻澶辫触: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/permutation-importance", response_model=PermutationImportanceResponse)
async def get_permutation_importance(
    request: Request,
    vars: str = Query("Temperature,Dust_Optical_Depth,Solar_Flux_DN,U_Wind,V_Wind"),
    training_task_id: int | None = Query(None, ge=1),
    mars_year: int = Query(DEFAULT_MARS_YEAR),
    ls_start: float = Query(90.0, ge=0, le=360),
    horizon: int = Query(3, ge=1, le=30),
    current_user: User | None = Depends(get_optional_user),
):
    """鑾峰彇鎺掑垪鐗瑰緛閲嶈鎬?(Permutation Feature Importance) 鍒嗚В缁撴灉"""
    try:
        selected_variables = [v.strip() for v in vars.split(",") if v.strip()]
        if training_task_id:
            current_user = _require_trained_model_user(current_user)
            service = _get_training_inference_service(request)
            return await service.task_permutation_importance(
                task_id=training_task_id,
                selected_variables=selected_variables,
                mars_year=mars_year,
                ls_start=ls_start,
                horizon=horizon,
                current_user=current_user,
                data_service=getattr(request.app.state, "data_service", None),
                personal_source_service=getattr(request.app.state, "personal_data_source_service", None),
            )
        ps = _get_predict_service(request)
        return await asyncio.to_thread(ps.get_permutation_importance,
            selected_variables=selected_variables,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PFI 鍒嗘瀽澶辫触: {e}")
        raise HTTPException(status_code=500, detail=str(e))




