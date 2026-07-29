# Data Overview Raw Dataset Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make user-uploaded raw datasets usable only in Data Overview: uploaded MCD can drive the full overview page, uploaded OpenMARS/NOMAD can drive only 3D ozone multi-source layers, and training/prediction no longer use ordinary user personal data.

**Architecture:** Keep official MCD as the default Data Overview source. Add explicit upload-id based overview source parameters instead of the old `data_source=personal` switch. Reuse `AnalysisService` by wrapping uploaded MCD files in a DataService-like adapter, and keep training/prediction on official or admin-managed server datasets.

**Tech Stack:** FastAPI, SQLAlchemy async sessions, xarray/netCDF4, NumPy, cachetools LRUCache, React 19, Vite, Node `node:test`, pytest.

---

## File Structure

Backend files to modify:

- `AresVision_backend/backend/services/upload_service.py` validates and classifies uploaded `.nc` files as `mcd`, `openmars`, or `nomad`.
- `AresVision_backend/backend/routers/upload.py` stops ordinary upload/contribution/review/revoke actions from triggering personal fusion cache rebuilds.
- `AresVision_backend/backend/services/user_data_service.py` exposes loaded raw upload payloads and keeps file parsing off the event loop.
- `AresVision_backend/backend/services/user_overview_source_service.py` is a new focused adapter module for uploaded MCD overview data and uploaded ozone source layers.
- `AresVision_backend/backend/routers/analysis.py` accepts explicit `mcd_upload_id`, `openmars_upload_id`, and `nomad_upload_id` query params for Data Overview routes.
- `AresVision_backend/backend/schemas/explore.py` extends `SourceMeta` with upload metadata.
- `AresVision_backend/backend/services/training_service.py` rejects new `personal` training sources and stops rebuilding personal inference data for historical tasks.
- `AresVision_backend/backend/services/inference_service.py` stops preparing personal data directories for trained-model prediction and comparison.
- `AresVision_backend/backend/routers/predict.py` rejects `data_source=personal` and removes personal prewarm behavior.
- `AresVision_backend/backend/schemas/training.py` updates the `data_source` description to official/admin-managed sources only.

Backend tests to create or modify:

- Create `AresVision_backend/backend/tests/test_raw_upload_classification.py`.
- Create `AresVision_backend/backend/tests/test_user_overview_source_service.py`.
- Create `AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py`.
- Create `AresVision_backend/backend/tests/test_personal_source_disabled_contract.py`.
- Modify `AresVision_backend/backend/tests/test_data_management_responsiveness.py`.
- Modify `AresVision_backend/backend/tests/test_training_personal_inference_env.py`.
- Modify `AresVision_backend/backend/tests/test_training_channel_contract.py`.

Frontend files to modify:

- `frontend/src/services/api.js` adds explicit overview upload-source query params and stops using personal params for prediction/training.
- `frontend/src/contexts/DataOverviewContext.jsx` stores selected uploaded MCD/OpenMARS/NOMAD ids.
- `frontend/src/pages/DataOverviewPage.jsx` passes selected upload ids to overview API calls.
- `frontend/src/pages/DataOverviewPage/SidebarMenu.jsx` replaces default/personal switching with official MCD plus uploaded-MCD and ozone-source selectors.
- `frontend/src/pages/DataOverviewPage/TopStatusBar.jsx` labels official and uploaded MCD sources correctly.
- `frontend/src/pages/DataOverviewPage/DetailPanel.jsx` passes overview source params through to chart components.
- `frontend/src/pages/DataOverviewPage/OverviewCharts/*.jsx` accepts `overviewSourceParams` instead of a `default/personal` mode.
- `frontend/src/pages/ExplorePage.jsx` renames "My Data Source" to raw Data Overview datasets.
- `frontend/src/pages/ExplorePage/MyDataTab.jsx` removes personal fusion/warmup UI and describes per-type usage.
- `frontend/src/pages/PredictPage.jsx` removes personal source state, availability checks, and personal query params.
- `frontend/src/pages/PredictPage/PredictSidebar.jsx` removes the data source toggle.
- `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.js` removes personal-source branches.
- `frontend/src/pages/ModelTrainingPage.jsx` removes personal source switching and always starts normal user training with `data_source='default'`.
- `frontend/src/i18n/zh.js` and `frontend/src/i18n/en.js` update user-facing copy.
- Remove `frontend/src/utils/personalSourceGuard.js` after imports are gone.
- Remove `frontend/src/components/PersonalSourceWarmupBar.jsx` after imports are gone.

Frontend tests to create or modify:

- Create `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.js`.
- Create `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js`.
- Create `frontend/src/pages/ExplorePage/rawDatasetUsage.js`.
- Create `frontend/src/pages/ExplorePage/rawDatasetUsage.test.js`.
- Modify `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js`.
- Modify workflow tests under `frontend/src/pages/PredictPage/WorkflowCanvas/` if the workflow still exposes `personal`.

## API Contract

Official Data Overview remains the default:

```text
GET /api/explore/overview/info
GET /api/explore/overview/globe?my=27&ls=10&variable=o3col
GET /api/explore/overview/seasonal-heatmap?my=27
GET /api/explore/overview/ozone-sources?my=27&ls=10
```

Uploaded MCD drives the full Data Overview page:

```text
GET /api/explore/overview/info?mcd_upload_id=123
GET /api/explore/overview/globe?mcd_upload_id=123&ls=10&variable=Temperature
GET /api/explore/overview/correlation?mcd_upload_id=123
```

Uploaded OpenMARS and NOMAD drive only 3D ozone layers:

```text
GET /api/explore/overview/ozone-sources?my=27&ls=10&openmars_upload_id=456&nomad_upload_id=789
GET /api/explore/overview/ozone-sources?mcd_upload_id=123&ls=10&openmars_upload_id=456&nomad_upload_id=789
```

Legacy user-facing personal source requests are rejected:

```text
GET /api/explore/overview/info?data_source=personal -> 400
POST /api/predict/run?data_source=personal -> 400
POST /api/training/start { "data_source": "personal" } -> 409 from router ValueError handling
```

### Task 1: Classify Raw Uploads And Stop Upload-Triggered Fusion

**Files:**
- Modify: `AresVision_backend/backend/services/upload_service.py`
- Modify: `AresVision_backend/backend/routers/upload.py`
- Test: `AresVision_backend/backend/tests/test_raw_upload_classification.py`
- Test: `AresVision_backend/backend/tests/test_data_management_responsiveness.py`

- [ ] **Step 1: Write failing upload classification tests**

Create `AresVision_backend/backend/tests/test_raw_upload_classification.py`:

```python
import sys
from pathlib import Path

import numpy as np
import xarray as xr

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.upload_service import UploadService  # noqa: E402


def _coords():
    return {
        "time": np.arange(2),
        "lat": np.array([-87.5, -82.5], dtype=np.float32),
        "lon": np.array([0.0, 5.0], dtype=np.float32),
    }


def test_detects_nomad_from_ozone_and_count():
    ds = xr.Dataset(
        data_vars={
            "Ls": (("time",), np.array([10.0, 20.0], dtype=np.float32)),
            "o3col": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
            "count": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.int32)),
        },
        coords=_coords(),
    )

    assert UploadService()._detect_data_type(ds) == "nomad"


def test_detects_mcd_overview_file_even_when_o3col_exists():
    ds = xr.Dataset(
        data_vars={
            "Ls": (("time",), np.array([10.0, 20.0], dtype=np.float32)),
            "o3col": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
            "Temperature": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
            "U_Wind": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
            "V_Wind": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
            "Solar_Flux_DN": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
        },
        coords=_coords(),
    )

    assert UploadService()._detect_data_type(ds) == "mcd"


def test_detects_openmars_when_ozone_has_no_mcd_or_nomad_markers():
    ds = xr.Dataset(
        data_vars={
            "Ls": (("time",), np.array([10.0, 20.0], dtype=np.float32)),
            "o3col": (("time", "lat", "lon"), np.ones((2, 2, 2), dtype=np.float32)),
        },
        coords=_coords(),
    )

    assert UploadService()._detect_data_type(ds) == "openmars"
```

- [ ] **Step 2: Write failing no-fusion helper test**

Append this test to `AresVision_backend/backend/tests/test_data_management_responsiveness.py`:

```python
def test_raw_upload_cache_rebuild_hook_is_noop():
    from types import SimpleNamespace
    from routers import upload as upload_router

    called = []

    class FakePersonalService:
        async def mark_build_queued(self, user_id):
            called.append(("mark", user_id))

        async def build_user_cache(self, user_id):
            called.append(("build", user_id))

    request = SimpleNamespace(
        app=SimpleNamespace(
            state=SimpleNamespace(
                enqueue_personal_cache_rebuild=lambda user_id: called.append(("enqueue", user_id)),
                personal_data_source_service=FakePersonalService(),
            )
        )
    )

    upload_router._enqueue_personal_cache_rebuild(request, 7)

    assert called == []
```

- [ ] **Step 3: Run failing tests**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_raw_upload_classification.py AresVision_backend/backend/tests/test_data_management_responsiveness.py -q
```

Expected: the NOMAD and MCD-overview detection tests fail because `_detect_data_type()` currently returns `openmars` before checking MCD/NOMAD markers, and the no-op helper test fails because the upload router still queues personal cache rebuild work.

- [ ] **Step 4: Implement raw source detection**

In `AresVision_backend/backend/services/upload_service.py`, add constants near `_LS_VAR_ALIASES`:

```python
_NOMAD_COUNT_ALIASES = {"count", "counts", "n_obs", "observation_count"}
_MCD_OVERVIEW_REQUIRED_HINTS = {"Temperature", "U_Wind", "V_Wind", "Solar_Flux_DN"}
```

Replace `_detect_data_type()` with:

```python
def _detect_data_type(self, ds: xr.Dataset) -> Optional[str]:
    """Return 'nomad', 'mcd', 'openmars', or None."""
    data_vars = set(ds.data_vars)
    data_vars_lower = {name.lower() for name in data_vars}

    has_ozone = "o3col" in data_vars
    has_nomad_count = bool(_NOMAD_COUNT_ALIASES & data_vars_lower)
    if has_ozone and has_nomad_count:
        return "nomad"

    has_mcd_vars = bool(_MCD_DETECT_VARS & data_vars)
    has_mcd_overview_shape = bool(_MCD_OVERVIEW_REQUIRED_HINTS & data_vars)
    if has_mcd_vars or has_mcd_overview_shape:
        return "mcd"

    if has_ozone:
        return "openmars"
    return None
```

Update `ValidationResult.data_type` comment to:

```python
data_type:  Optional[str]   = None   # 'openmars' | 'mcd' | 'nomad' | None
```

Update the validation error text in `_validate_dataset()` so it mentions all three accepted kinds:

```python
result.error = (
    "无法识别数据类型：文件需要包含 o3col（OpenMARS），"
    "MCD 环境变量如 Temperature / U_Wind，或 o3col + count（NOMAD）。"
)
```

- [ ] **Step 5: Make the personal cache rebuild hook a no-op**

In `AresVision_backend/backend/routers/upload.py`, replace `_enqueue_personal_cache_rebuild()` with:

```python
def _enqueue_personal_cache_rebuild(request: Request | None, user_id: int | None) -> None:
    """Deprecated: raw user uploads no longer build fused personal data caches."""
    return
```

Keep the existing calls in upload/delete/review/contribute/revoke for this task so the diff is small. A later cleanup task can remove the dead call sites once frontend and backend behavior is stable.

- [ ] **Step 6: Run tests and commit**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_raw_upload_classification.py AresVision_backend/backend/tests/test_data_management_responsiveness.py -q
```

Expected: all tests pass.

Commit:

```powershell
git add AresVision_backend/backend/services/upload_service.py AresVision_backend/backend/routers/upload.py AresVision_backend/backend/tests/test_raw_upload_classification.py AresVision_backend/backend/tests/test_data_management_responsiveness.py
git commit -m "fix: stop raw uploads from rebuilding personal source"
```

### Task 2: Add Uploaded MCD And Ozone Source Adapters

**Files:**
- Create: `AresVision_backend/backend/services/user_overview_source_service.py`
- Modify: `AresVision_backend/backend/services/user_data_service.py`
- Test: `AresVision_backend/backend/tests/test_user_overview_source_service.py`

- [ ] **Step 1: Write failing adapter tests**

Create `AresVision_backend/backend/tests/test_user_overview_source_service.py`:

```python
import sys
from pathlib import Path

import numpy as np
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.analysis_service import AnalysisService  # noqa: E402
from services.user_overview_source_service import (  # noqa: E402
    UserMcdOverviewDataView,
    build_uploaded_ozone_layer,
    build_uploaded_nomad_validation,
)


def _uploaded_mcd():
    lat = np.array([-2.5, 2.5], dtype=np.float32)
    lon = np.array([0.0, 5.0], dtype=np.float32)
    ls = np.array([10.0, 20.0, 30.0], dtype=np.float32)
    ozone = np.arange(12, dtype=np.float32).reshape(3, 2, 2) + 1
    env = np.ones((3, 2, 2), dtype=np.float32)
    return {
        "data_type": "mcd",
        "lat": lat,
        "lon": lon,
        "ls": ls,
        "o3col": ozone,
        "Temperature": env * 180.0,
        "U_Wind": env * 5.0,
        "V_Wind": env * 2.0,
        "Solar_Flux_DN": env * 90.0,
    }


def test_uploaded_mcd_view_can_drive_analysis_service():
    view = UserMcdOverviewDataView(upload_id=12, mars_year=34, data=_uploaded_mcd())
    service = AnalysisService(view, mcd_variables=["Temperature", "U_Wind", "V_Wind", "Solar_Flux_DN"])

    globe = service.get_globe_data(34, 20.0, variable="Temperature")
    heatmap = service.get_seasonal_heatmap(34, variable="o3col")
    corr = service.get_correlation_matrix(34)

    assert globe["mars_year"] == 34
    assert globe["variable"] == "Temperature"
    assert globe["points"]
    assert heatmap["x"] == [10.0, 20.0, 30.0]
    assert corr["variable_names"] == ["o3col", "Temperature", "U_Wind", "V_Wind", "Solar_Flux_DN"]


def test_uploaded_mcd_view_rejects_wrong_year():
    view = UserMcdOverviewDataView(upload_id=12, mars_year=34, data=_uploaded_mcd())

    with pytest.raises(ValueError, match="MY34"):
        view.get_openmars_data(27)


def test_uploaded_ozone_layer_uses_nearest_ls():
    layer = build_uploaded_ozone_layer(_uploaded_mcd(), ls=19.0, source="openmars")

    assert layer["source"] == "openmars"
    assert layer["ls"] == 20.0
    assert layer["points"]
    assert layer["minVal"] <= layer["maxVal"]


def test_uploaded_nomad_validation_compares_shared_cells():
    mcd_layer = {
        "source": "mcd",
        "ls": 10.0,
        "points": [
            {"lat": -2.5, "lng": 0.0, "val": 10.0},
            {"lat": 2.5, "lng": 5.0, "val": 20.0},
        ],
    }
    nomad_layer = {
        "source": "nomad",
        "ls": 10.0,
        "points": [
            {"lat": -2.5, "lng": 0.0, "val": 8.0, "count": 3},
            {"lat": 2.5, "lng": 5.0, "val": 22.0, "count": 4},
        ],
    }

    validation = build_uploaded_nomad_validation(mcd_layer, nomad_layer)

    assert validation["sample_count"] == 2
    assert validation["bias"] == 0.0
    assert validation["mae"] == 2.0
    assert validation["points"][0]["count"] == 3
```

- [ ] **Step 2: Run tests to verify missing module**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_user_overview_source_service.py -q
```

Expected: FAIL with `ModuleNotFoundError: No module named 'services.user_overview_source_service'`.

- [ ] **Step 3: Expose loaded raw data in UserDataService**

In `AresVision_backend/backend/services/user_data_service.py`, add this public method under `_get_data()`:

```python
async def get_loaded_dataset(self, upload_id: int) -> dict:
    """Return the cached parsed payload for a raw uploaded dataset."""
    return await self._get_data(upload_id)
```

Update `_load_nc_file()` so NOMAD count arrays are preserved:

```python
for count_name in ("count", "counts", "n_obs", "observation_count"):
    if count_name in ds:
        result["count"] = ds[count_name].values
        break
```

Update the local type detection inside `_load_nc_file()` to match Task 1:

```python
data_vars = set(ds.data_vars)
data_vars_lower = {name.lower() for name in data_vars}
has_count = bool({"count", "counts", "n_obs", "observation_count"} & data_vars_lower)
mcd_vars_found = [v for v in MCD_VARIABLES if v in ds]
data_type = (
    "nomad" if "o3col" in ds and has_count
    else "mcd" if mcd_vars_found
    else "openmars" if "o3col" in ds
    else "unknown"
)
```

- [ ] **Step 4: Create uploaded overview adapter module**

Create `AresVision_backend/backend/services/user_overview_source_service.py`:

```python
from __future__ import annotations

import numpy as np

OVERVIEW_ENV_FIELDS = ["Temperature", "U_Wind", "V_Wind", "Solar_Flux_DN"]


def _as_1d(data: dict, key: str) -> np.ndarray:
    values = data.get(key)
    if values is None:
        raise ValueError(f"uploaded dataset missing {key}")
    return np.asarray(values, dtype=np.float32).reshape(-1)


def _as_3d(data: dict, key: str) -> np.ndarray:
    values = data.get(key)
    if values is None:
        raise ValueError(f"uploaded dataset missing {key}")
    arr = np.asarray(values, dtype=np.float32)
    if arr.ndim == 4:
        arr = np.nanmean(arr, axis=1)
    if arr.ndim != 3:
        raise ValueError(f"uploaded dataset field {key} must be 3D, got {arr.shape}")
    return arr


def _sort_by_ls(data: dict, field_names: list[str]) -> dict:
    ls = _as_1d(data, "ls")
    order = np.argsort(ls)
    out = dict(data)
    out["ls"] = ls[order]
    for field_name in field_names:
        if field_name in out:
            arr = _as_3d(out, field_name)
            out[field_name] = arr[order]
    if "count" in out:
        count = np.asarray(out["count"])
        if count.ndim >= 1 and count.shape[0] == len(order):
            out["count"] = count[order]
    return out


class UserMcdOverviewDataView:
    """DataService-like adapter for one uploaded MCD overview dataset."""

    def __init__(self, upload_id: int, mars_year: int, data: dict):
        self.upload_id = int(upload_id)
        self.mars_year = int(mars_year)
        self._data = _sort_by_ls(data, ["o3col", *OVERVIEW_ENV_FIELDS])

    def _check_year(self, mars_year: int) -> None:
        if int(mars_year) != self.mars_year:
            raise ValueError(f"uploaded MCD source only supports MY{self.mars_year}")

    def get_openmars_data(self, mars_year: int) -> dict:
        self._check_year(mars_year)
        return {
            "o3col": _as_3d(self._data, "o3col"),
            "ls": _as_1d(self._data, "ls"),
            "lat": _as_1d(self._data, "lat"),
            "lon": _as_1d(self._data, "lon"),
        }

    def get_aligned_mcd_data(self, mars_year: int) -> dict:
        self._check_year(mars_year)
        out = {
            "ls": _as_1d(self._data, "ls"),
            "lat": _as_1d(self._data, "lat"),
            "lon": _as_1d(self._data, "lon"),
        }
        for field_name in OVERVIEW_ENV_FIELDS:
            if field_name in self._data:
                out[field_name] = _as_3d(self._data, field_name)
        return out

    def get_mcd_data(self, mars_year: int) -> dict:
        self._check_year(mars_year)
        out = self.get_aligned_mcd_data(mars_year)
        for field_name in OVERVIEW_ENV_FIELDS:
            hourly_name = f"{field_name}_hourly"
            if hourly_name in self._data:
                out[hourly_name] = self._data[hourly_name]
        return out

    def get_available_years(self) -> list[int]:
        return [self.mars_year]

    def get_ls_range(self, mars_year: int) -> tuple[float, float]:
        self._check_year(mars_year)
        ls = _as_1d(self._data, "ls")
        return float(ls[0]), float(ls[-1])

    @staticmethod
    def get_nearest_ls_index(ls_array: np.ndarray, target_ls: float) -> int:
        return int(np.argmin(np.abs(np.asarray(ls_array, dtype=float) - float(target_ls))))


def _points_from_field(field: np.ndarray, lat_arr: np.ndarray, lon_arr: np.ndarray, count: np.ndarray | None = None) -> list[dict]:
    points = []
    for i, lat in enumerate(lat_arr):
        for j, lon in enumerate(lon_arr):
            val = float(field[i, j])
            if not np.isfinite(val):
                continue
            lon_value = float(lon) if float(lon) <= 180 else float(lon) - 360
            point = {"lat": float(lat), "lng": lon_value, "val": val}
            if count is not None:
                point["count"] = int(count[i, j])
            points.append(point)
    return points


def build_uploaded_ozone_layer(data: dict, ls: float, source: str) -> dict:
    sorted_data = _sort_by_ls(data, ["o3col"])
    ls_arr = _as_1d(sorted_data, "ls")
    idx = int(np.argmin(np.abs(ls_arr.astype(float) - float(ls))))
    field = _as_3d(sorted_data, "o3col")[idx]
    count = None
    if source == "nomad" and "count" in sorted_data:
        count_arr = np.asarray(sorted_data["count"])
        if count_arr.ndim == 3 and count_arr.shape[0] > idx:
            count = count_arr[idx]
            field = np.where(count > 0, field, np.nan)
    valid = field[np.isfinite(field)]
    return {
        "source": source,
        "points": _points_from_field(field, _as_1d(sorted_data, "lat"), _as_1d(sorted_data, "lon"), count=count),
        "minVal": float(np.nanmin(valid)) if valid.size else 0.0,
        "maxVal": float(np.nanmax(valid)) if valid.size else 1.0,
        "ls": float(ls_arr[idx]),
    }


def _safe_correlation(a: np.ndarray, b: np.ndarray) -> float | None:
    if a.size < 2 or b.size < 2 or float(np.nanstd(a)) == 0.0 or float(np.nanstd(b)) == 0.0:
        return None
    corr = float(np.corrcoef(a, b)[0, 1])
    return corr if np.isfinite(corr) else None


def build_uploaded_nomad_validation(mcd_layer: dict, nomad_layer: dict | None) -> dict | None:
    if not nomad_layer:
        return None
    mcd_by_key = {
        (round(float(point["lat"]), 3), round(float(point["lng"]), 3)): float(point["val"])
        for point in mcd_layer.get("points", [])
        if np.isfinite(float(point.get("val", np.nan)))
    }
    points = []
    mcd_values = []
    nomad_values = []
    diffs = []
    for point in nomad_layer.get("points", []):
        key = (round(float(point["lat"]), 3), round(float(point["lng"]), 3))
        if key not in mcd_by_key:
            continue
        nomad_value = float(point.get("val", np.nan))
        if not np.isfinite(nomad_value):
            continue
        mcd_value = mcd_by_key[key]
        diff = float(mcd_value - nomad_value)
        points.append({
            "lat": float(point["lat"]),
            "lng": float(point["lng"]),
            "val": diff,
            "mcd_value": mcd_value,
            "nomad_value": nomad_value,
            "count": int(point.get("count", 1)),
        })
        mcd_values.append(mcd_value)
        nomad_values.append(nomad_value)
        diffs.append(diff)
    if not points:
        return None
    diff_arr = np.asarray(diffs, dtype=np.float64)
    return {
        "source": "nomad",
        "comparison": "MCD-NOMAD",
        "matched_ls": float(nomad_layer.get("ls", mcd_layer.get("ls", 0.0))),
        "sample_count": int(len(points)),
        "bias": float(np.mean(diff_arr)),
        "mae": float(np.mean(np.abs(diff_arr))),
        "rmse": float(np.sqrt(np.mean(diff_arr ** 2))),
        "correlation": _safe_correlation(np.asarray(mcd_values), np.asarray(nomad_values)),
        "minDiff": float(np.min(diff_arr)),
        "maxDiff": float(np.max(diff_arr)),
        "points": points,
    }
```

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_user_overview_source_service.py -q
```

Expected: all tests pass.

Commit:

```powershell
git add AresVision_backend/backend/services/user_data_service.py AresVision_backend/backend/services/user_overview_source_service.py AresVision_backend/backend/tests/test_user_overview_source_service.py
git commit -m "feat: add uploaded overview source adapters"
```

### Task 3: Wire Uploaded Sources Into Data Overview Backend Routes

**Files:**
- Modify: `AresVision_backend/backend/routers/analysis.py`
- Modify: `AresVision_backend/backend/schemas/explore.py`
- Test: `AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py`

- [ ] **Step 1: Write failing route tests**

Create `AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py`:

```python
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from auth.dependencies import get_optional_user  # noqa: E402
from config import OVERVIEW_MCD_VARIABLES  # noqa: E402
from routers.analysis import router  # noqa: E402
from services.analysis_service import AnalysisService  # noqa: E402
from services.user_overview_source_service import UserMcdOverviewDataView  # noqa: E402


class FakeOfficialOverview:
    def get_available_years(self):
        return [27]

    def get_ls_range(self, mars_year):
        return (0.0, 360.0)

    def get_ozone_capabilities(self):
        return {"openmars": True, "nomad": False, "diff_pairs": ["MCD-OpenMARS"], "coverage": {}}

    def get_ozone_overlay_payload(self, mars_year, ls):
        return {
            "mars_year": mars_year,
            "requested_ls": ls,
            "anchor_ls": ls,
            "mcd": {"source": "mcd", "points": [], "minVal": 0.0, "maxVal": 1.0, "ls": ls},
            "openmars": None,
            "nomad": None,
            "available_sources": ["mcd"],
            "diff_candidates": [],
            "validation": {"nomad": None},
            "capabilities": self.get_ozone_capabilities(),
        }


class FakeUserDataService:
    async def get_loaded_dataset(self, upload_id):
        lat = np.array([-2.5, 2.5], dtype=np.float32)
        lon = np.array([0.0, 5.0], dtype=np.float32)
        ls = np.array([10.0, 20.0], dtype=np.float32)
        field = np.ones((2, 2, 2), dtype=np.float32)
        if upload_id == 123:
            return {
                "data_type": "mcd",
                "lat": lat,
                "lon": lon,
                "ls": ls,
                "o3col": field,
                "Temperature": field * 180.0,
                "U_Wind": field,
                "V_Wind": field,
                "Solar_Flux_DN": field,
            }
        if upload_id == 456:
            return {"data_type": "openmars", "lat": lat, "lon": lon, "ls": ls, "o3col": field * 2.0}
        if upload_id == 789:
            return {"data_type": "nomad", "lat": lat, "lon": lon, "ls": ls, "o3col": field * 3.0, "count": np.ones((2, 2, 2), dtype=np.int32)}
        raise ValueError("missing upload")


def build_client(monkeypatch):
    import routers.analysis as analysis_module

    async def fake_upload_record(upload_id, current_user, expected_types):
        data_type = {123: "mcd", 456: "openmars", 789: "nomad"}[upload_id]
        assert data_type in expected_types
        return SimpleNamespace(
            id=upload_id,
            user_id=7,
            data_type=data_type,
            mars_year=34,
            filename=f"{data_type}.nc",
            status="valid",
        )

    monkeypatch.setattr(analysis_module, "_get_accessible_upload_record", fake_upload_record)

    app = FastAPI()
    official = FakeOfficialOverview()
    app.state.mcd_overview_service = official
    official_view = UserMcdOverviewDataView(
        upload_id=0,
        mars_year=27,
        data={
            "lat": np.array([-2.5, 2.5], dtype=np.float32),
            "lon": np.array([0.0, 5.0], dtype=np.float32),
            "ls": np.array([10.0, 20.0], dtype=np.float32),
            "o3col": np.ones((2, 2, 2), dtype=np.float32),
            "Temperature": np.ones((2, 2, 2), dtype=np.float32),
            "U_Wind": np.ones((2, 2, 2), dtype=np.float32),
            "V_Wind": np.ones((2, 2, 2), dtype=np.float32),
            "Solar_Flux_DN": np.ones((2, 2, 2), dtype=np.float32),
        },
    )
    app.state.mcd_overview_analysis_service = AnalysisService(official_view, mcd_variables=OVERVIEW_MCD_VARIABLES)
    app.state.user_data_service = FakeUserDataService()
    app.dependency_overrides[get_optional_user] = lambda: SimpleNamespace(id=7, role="user")
    app.include_router(router, prefix="/api")
    return TestClient(app)


def test_overview_info_uses_uploaded_mcd(monkeypatch):
    client = build_client(monkeypatch)

    response = client.get("/api/explore/overview/info?mcd_upload_id=123")

    assert response.status_code == 200
    payload = response.json()
    assert payload["available_years"] == [34]
    assert payload["timeline"] == {"min": 10.0, "max": 20.0, "step": 5.0}
    assert payload["source_meta"]["effective_source"] == "user_mcd"
    assert payload["source_meta"]["upload_id"] == 123


def test_overview_globe_uses_uploaded_mcd(monkeypatch):
    client = build_client(monkeypatch)

    response = client.get("/api/explore/overview/globe?mcd_upload_id=123&ls=20&variable=Temperature")

    assert response.status_code == 200
    payload = response.json()
    assert payload["mars_year"] == 34
    assert payload["variable"] == "Temperature"
    assert payload["source_meta"]["effective_source"] == "user_mcd"


def test_overview_ozone_sources_can_include_uploaded_openmars_and_nomad(monkeypatch):
    client = build_client(monkeypatch)

    response = client.get("/api/explore/overview/ozone-sources?mcd_upload_id=123&openmars_upload_id=456&nomad_upload_id=789&ls=10")

    assert response.status_code == 200
    payload = response.json()
    assert payload["available_sources"] == ["mcd", "openmars", "nomad"]
    assert payload["mcd"]["source"] == "mcd"
    assert payload["openmars"]["source"] == "openmars"
    assert payload["nomad"]["source"] == "nomad"
    assert payload["validation"]["nomad"]["sample_count"] > 0


def test_legacy_personal_overview_source_is_rejected(monkeypatch):
    client = build_client(monkeypatch)

    response = client.get("/api/explore/overview/info?data_source=personal")

    assert response.status_code == 400
    assert "mcd_upload_id" in response.json()["detail"]
```

- [ ] **Step 2: Run route tests to verify failure**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py -q
```

Expected: FAIL because `SourceMeta` lacks `upload_id`, route helpers do not exist, and overview routes ignore upload ids.

- [ ] **Step 3: Extend SourceMeta**

In `AresVision_backend/backend/schemas/explore.py`, add fields to `SourceMeta`:

```python
upload_id: int | None = None
upload_filename: str | None = None
data_type: str | None = None
```

- [ ] **Step 4: Add analysis route helpers**

In `AresVision_backend/backend/routers/analysis.py`, import:

```python
from sqlalchemy import select
from database.engine import async_session_maker
from database.models import UploadRecord
from services.user_overview_source_service import (
    OVERVIEW_ENV_FIELDS as USER_OVERVIEW_ENV_FIELDS,
    UserMcdOverviewDataView,
    build_uploaded_nomad_validation,
    build_uploaded_ozone_layer,
)
```

Add these helpers near `_with_source_meta()`:

```python
_RAW_UPLOAD_ACTIVE_STATUSES = {"valid", "pending_review", "approved", "rejected"}


def _reject_legacy_personal(data_source: str) -> None:
    requested = (data_source or "default").strip().lower()
    if requested == "personal":
        raise HTTPException(
            status_code=400,
            detail="data_source=personal has been retired; use mcd_upload_id for Data Overview uploaded MCD data",
        )
    if requested not in ("default", "official"):
        raise HTTPException(status_code=400, detail="data_source must be 'default'")


async def _get_accessible_upload_record(upload_id: int, current_user: User | None, expected_types: set[str]) -> UploadRecord:
    if current_user is None:
        raise HTTPException(status_code=401, detail="sign in before using uploaded datasets")
    async with async_session_maker() as db:
        record = await db.get(UploadRecord, upload_id)
    if record is None:
        raise HTTPException(status_code=404, detail="uploaded dataset not found")
    if record.user_id != current_user.id and current_user.role != "admin" and record.status != "approved":
        raise HTTPException(status_code=403, detail="no permission to access uploaded dataset")
    if record.status not in _RAW_UPLOAD_ACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail=f"uploaded dataset status '{record.status}' is not usable")
    if str(record.data_type or "").lower() not in expected_types:
        raise HTTPException(status_code=400, detail=f"uploaded dataset must be one of: {', '.join(sorted(expected_types))}")
    return record


def _uploaded_source_meta(record: UploadRecord, effective_source: str) -> dict:
    return {
        "requested_source": "user_upload",
        "effective_source": effective_source,
        "fallback": False,
        "message": None,
        "mars_year": int(record.mars_year or DEFAULT_MARS_YEAR),
        "upload_id": int(record.id),
        "upload_filename": record.filename,
        "data_type": record.data_type,
    }
```

- [ ] **Step 5: Add uploaded MCD overview context resolution**

Replace `_resolve_overview_context()` with an async version:

```python
async def _resolve_overview_context(
    request: Request,
    my: int,
    data_source: str,
    current_user: User | None,
    mcd_upload_id: int | None = None,
) -> tuple[AnalysisService, dict, int]:
    _reject_legacy_personal(data_source)
    if not mcd_upload_id:
        return request.app.state.mcd_overview_analysis_service, _overview_source_meta("default", my), my

    record = await _get_accessible_upload_record(mcd_upload_id, current_user, {"mcd"})
    data = await request.app.state.user_data_service.get_loaded_dataset(record.id)
    resolved_year = int(record.mars_year or DEFAULT_MARS_YEAR)
    view = UserMcdOverviewDataView(upload_id=record.id, mars_year=resolved_year, data=data)
    service = AnalysisService(view, mcd_variables=OVERVIEW_MCD_VARIABLES)
    return service, _uploaded_source_meta(record, "user_mcd"), resolved_year
```

Update every `/overview/*` route that calls `_resolve_overview_context()` so it:

- Accepts `current_user: User | None = Depends(get_optional_user)`.
- Accepts `mcd_upload_id: int | None = Query(None, ge=1)`.
- Awaits `_resolve_overview_context(request, my, data_source, current_user, mcd_upload_id)`.

Example for `/overview/globe`:

```python
service, source_meta, resolved_year = await _resolve_overview_context(
    request, my, data_source, current_user, mcd_upload_id
)
```

- [ ] **Step 6: Update overview info**

Update `get_overview_info()` signature:

```python
async def get_overview_info(
    request: Request,
    data_source: str = Query("default", description="default"),
    mcd_upload_id: int | None = Query(None, ge=1),
    current_user: User | None = Depends(get_optional_user),
):
```

Use this logic at the start of the route:

```python
_reject_legacy_personal(data_source)
if mcd_upload_id:
    record = await _get_accessible_upload_record(mcd_upload_id, current_user, {"mcd"})
    data = await request.app.state.user_data_service.get_loaded_dataset(record.id)
    resolved_year = int(record.mars_year or DEFAULT_MARS_YEAR)
    view = UserMcdOverviewDataView(upload_id=record.id, mars_year=resolved_year, data=data)
    ls_min, ls_max = view.get_ls_range(resolved_year)
    return {
        "available_years": [resolved_year],
        "timeline": {"min": float(ls_min), "max": float(ls_max), "step": 5.0},
        "ozone_capabilities": {
            "openmars": True,
            "nomad": True,
            "diff_pairs": ["MCD-OpenMARS", "MCD-NOMAD"],
            "coverage": {},
        },
        "source_meta": _uploaded_source_meta(record, "user_mcd"),
    }
```

Keep the existing official branch after this upload branch.

- [ ] **Step 7: Wire uploaded ozone sources**

Update `get_overview_ozone_sources()` to accept:

```python
mcd_upload_id: int | None = Query(None, ge=1),
openmars_upload_id: int | None = Query(None, ge=1),
nomad_upload_id: int | None = Query(None, ge=1),
current_user: User | None = Depends(get_optional_user),
```

Use official payload as a base when `mcd_upload_id` is absent:

```python
_reject_legacy_personal(data_source)
overview_service = request.app.state.mcd_overview_service
payload = overview_service.get_ozone_overlay_payload(my, ls)

if mcd_upload_id:
    mcd_record = await _get_accessible_upload_record(mcd_upload_id, current_user, {"mcd"})
    mcd_data = await request.app.state.user_data_service.get_loaded_dataset(mcd_record.id)
    mcd_layer = build_uploaded_ozone_layer(mcd_data, ls, "mcd")
    payload["mcd"] = mcd_layer
    payload["anchor_ls"] = mcd_layer["ls"]
    payload["mars_year"] = int(mcd_record.mars_year or my)
else:
    mcd_layer = payload["mcd"]

if openmars_upload_id:
    openmars_record = await _get_accessible_upload_record(openmars_upload_id, current_user, {"openmars"})
    openmars_data = await request.app.state.user_data_service.get_loaded_dataset(openmars_record.id)
    payload["openmars"] = build_uploaded_ozone_layer(openmars_data, payload["anchor_ls"], "openmars")

if nomad_upload_id:
    nomad_record = await _get_accessible_upload_record(nomad_upload_id, current_user, {"nomad"})
    nomad_data = await request.app.state.user_data_service.get_loaded_dataset(nomad_record.id)
    payload["nomad"] = build_uploaded_ozone_layer(nomad_data, payload["anchor_ls"], "nomad")

payload["available_sources"] = [
    source for source in ("mcd", "openmars", "nomad") if payload.get(source) is not None
]
payload["diff_candidates"] = []
if payload.get("openmars") is not None:
    payload["diff_candidates"].append("MCD-OpenMARS")
if payload.get("nomad") is not None:
    payload["diff_candidates"].append("MCD-NOMAD")
payload["validation"] = {
    "nomad": build_uploaded_nomad_validation(payload["mcd"], payload.get("nomad"))
}
payload["capabilities"] = {
    "openmars": payload.get("openmars") is not None,
    "nomad": payload.get("nomad") is not None,
    "diff_pairs": payload["diff_candidates"],
    "coverage": payload.get("capabilities", {}).get("coverage", {}),
}
return payload
```

- [ ] **Step 8: Run overview route tests and existing overview tests**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py AresVision_backend/backend/tests/test_analysis_overview_routes.py -q
```

Expected: all tests pass.

Commit:

```powershell
git add AresVision_backend/backend/routers/analysis.py AresVision_backend/backend/schemas/explore.py AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py
git commit -m "feat: support uploaded raw datasets in overview routes"
```

### Task 4: Disable Personal Sources In Training And Prediction Backend

**Files:**
- Modify: `AresVision_backend/backend/services/training_service.py`
- Modify: `AresVision_backend/backend/services/inference_service.py`
- Modify: `AresVision_backend/backend/routers/predict.py`
- Modify: `AresVision_backend/backend/schemas/training.py`
- Test: `AresVision_backend/backend/tests/test_personal_source_disabled_contract.py`
- Test: `AresVision_backend/backend/tests/test_training_personal_inference_env.py`
- Test: `AresVision_backend/backend/tests/test_training_channel_contract.py`

- [ ] **Step 1: Write failing backend contract tests**

Create `AresVision_backend/backend/tests/test_personal_source_disabled_contract.py`:

```python
import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.training_service import TrainingService  # noqa: E402
from routers import predict as predict_router  # noqa: E402


def test_training_rejects_personal_source_before_database_work():
    service = TrainingService()

    async def run():
        with pytest.raises(ValueError, match="Data Overview"):
            await service.start_training(
                user_id=7,
                model_script="demo3.py",
                hyperparameters={},
                custom_model_name="personal-blocked",
                data_source="personal",
            )

    asyncio.run(run())


def test_training_task_personal_inference_env_is_noop():
    service = TrainingService()
    task = SimpleNamespace(id=42, user_id=7, hyperparameters='{"_data_source":"personal"}')

    env, temp_root = asyncio.run(
        service.prepare_task_inference_data_env(
            task,
            data_service=object(),
            personal_source_service=object(),
        )
    )

    assert env == {}
    assert temp_root is None


def test_predict_context_rejects_personal_source():
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))

    async def run():
        with pytest.raises(Exception) as exc:
            await predict_router._resolve_predict_context(request, 27, "personal", None)
        assert getattr(exc.value, "status_code", None) == 400
        assert "Data Overview" in getattr(exc.value, "detail", "")

    asyncio.run(run())
```

- [ ] **Step 2: Run failing contract tests**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_personal_source_disabled_contract.py -q
```

Expected: FAIL because training and prediction still accept `personal`.

- [ ] **Step 3: Reject personal in TrainingService**

In `AresVision_backend/backend/services/training_service.py`, add:

```python
def _normalize_training_data_source(data_source: str | None) -> str:
    source = (data_source or "default").strip().lower()
    if source == "personal":
        raise ValueError("Personal raw uploads are only available in Data Overview; training uses server-managed datasets.")
    if source not in ("default",):
        raise ValueError("training data_source must be 'default'")
    return source
```

Replace:

```python
source = (data_source or "default").strip().lower()
if source not in ("default", "personal"):
    source = "default"
```

with:

```python
source = _normalize_training_data_source(data_source)
```

Remove the `if source == "personal":` block in `start_training()` so new tasks never call `_prepare_personal_training_env()`.

Replace `prepare_task_inference_data_env()` with:

```python
async def prepare_task_inference_data_env(
    self,
    task: ModelTrainingTask,
    data_service: DataService | None,
    personal_source_service: PersonalDataSourceService | None,
) -> tuple[dict[str, str], Path | None]:
    return {}, None
```

Keep `_prepare_personal_training_env()` in place for this task to minimize the diff. It becomes unreachable from normal paths.

- [ ] **Step 4: Stop inference from rebuilding personal data**

In `AresVision_backend/backend/services/inference_service.py`, replace `_prepare_task_data_env()` with:

```python
async def _prepare_task_data_env(
    self,
    task,
    hypers: dict,
    data_service=None,
    personal_source_service=None,
):
    return {}, None
```

This makes historical `_data_source=personal` metadata display-only for trained model evaluation. It prevents new requests from reconstructing user personal data directories.

- [ ] **Step 5: Reject personal in prediction route helpers**

In `AresVision_backend/backend/routers/predict.py`, add:

```python
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
```

Replace the source validation in `_resolve_predict_context()` and `_resolve_diurnal_context()` with:

```python
requested = _normalize_predict_source(data_source)
```

Replace `prewarm_personal_source()` body with:

```python
@router.post("/prewarm")
async def prewarm_predict_source(
    request: Request,
    my: int = Query(DEFAULT_MARS_YEAR),
    data_source: str = Query("default", description="default"),
    current_user: User | None = Depends(get_optional_user),
):
    requested = _normalize_predict_source(data_source)
    ps, source_meta, resolved_year = await _resolve_predict_context(request, my, requested, current_user)
    warmed = False
    ml_data_prep = getattr(ps, "ml_data_prep", None)
    if ml_data_prep is not None and hasattr(ml_data_prep, "prewarm_for_year"):
        ml_data_prep.prewarm_for_year(resolved_year)
        warmed = True
    return {"ok": True, "warmed": warmed, "mars_year": resolved_year, "source_meta": source_meta}
```

Update route query descriptions from `"default | personal"` to `"default"` in `predict.py`.

- [ ] **Step 6: Update training schema and tests**

In `AresVision_backend/backend/schemas/training.py`, change:

```python
data_source: str = Field(default="default", description="default | personal")
```

to:

```python
data_source: str = Field(default="default", description="server-managed training dataset source")
```

In `AresVision_backend/backend/tests/test_training_personal_inference_env.py`, replace tests that expect personal env creation with no-op expectations:

```python
def test_training_service_ignores_historical_personal_inference_data_env():
    install_service_import_stubs()
    from services.training_service import TrainingService

    task = SimpleNamespace(
        id=42,
        user_id=7,
        hyperparameters=json.dumps({"_data_source": "personal"}),
    )
    service = TrainingService()

    env, temp_root = asyncio.run(
        service.prepare_task_inference_data_env(
            task,
            data_service=object(),
            personal_source_service=object(),
        )
    )

    assert env == {}
    assert temp_root is None
```

Remove assertions that expect `ARESVISION_OPENMARS_DIR` or `ARESVISION_MCD_DIR` for personal tasks.

In `AresVision_backend/backend/tests/test_training_channel_contract.py`, keep the existing `_data_source` skip assertion but change input to `"default"`:

```python
"_data_source": "default",
```

- [ ] **Step 7: Run backend tests and commit**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_personal_source_disabled_contract.py AresVision_backend/backend/tests/test_training_personal_inference_env.py AresVision_backend/backend/tests/test_training_channel_contract.py AresVision_backend/backend/tests/test_trained_model_predict_contract.py -q
```

Expected: all tests pass.

Commit:

```powershell
git add AresVision_backend/backend/services/training_service.py AresVision_backend/backend/services/inference_service.py AresVision_backend/backend/routers/predict.py AresVision_backend/backend/schemas/training.py AresVision_backend/backend/tests/test_personal_source_disabled_contract.py AresVision_backend/backend/tests/test_training_personal_inference_env.py AresVision_backend/backend/tests/test_training_channel_contract.py
git commit -m "fix: disable personal raw data for training and prediction"
```

### Task 5: Add Frontend Source Param Builders And Pure Source Option Tests

**Files:**
- Modify: `frontend/src/services/api.js`
- Create: `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.js`
- Create: `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js`

- [ ] **Step 1: Write source option tests**

Create `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOverviewUploadOptions,
  buildOverviewSourceParams,
} from './uploadedSourceOptions.js';

test('buildOverviewUploadOptions groups usable raw uploads by overview role', () => {
  const uploads = [
    { id: 1, filename: 'bad.nc', data_type: 'mcd', status: 'invalid' },
    { id: 2, filename: 'mcd.nc', data_type: 'mcd', status: 'valid', mars_year: 34 },
    { id: 3, filename: 'om.nc', data_type: 'openmars', status: 'approved', mars_year: 34 },
    { id: 4, filename: 'nomad.nc', data_type: 'nomad', status: 'rejected', mars_year: 34 },
  ];

  const options = buildOverviewUploadOptions(uploads);

  assert.deepEqual(options.mcd.map((item) => item.id), [2]);
  assert.deepEqual(options.openmars.map((item) => item.id), [3]);
  assert.deepEqual(options.nomad.map((item) => item.id), [4]);
});

test('buildOverviewSourceParams emits explicit upload ids only when selected', () => {
  assert.equal(buildOverviewSourceParams({}), '');
  assert.equal(
    buildOverviewSourceParams({ mcdUploadId: 12, openmarsUploadId: 34, nomadUploadId: 56 }),
    'mcd_upload_id=12&openmars_upload_id=34&nomad_upload_id=56'
  );
});
```

- [ ] **Step 2: Create helper implementation**

Create `frontend/src/pages/DataOverviewPage/uploadedSourceOptions.js`:

```javascript
const USABLE_UPLOAD_STATUSES = new Set(['valid', 'pending_review', 'approved', 'rejected']);

function normalizeType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUpload(upload) {
  return {
    id: Number(upload.id),
    filename: upload.filename || `Upload #${upload.id}`,
    dataType: normalizeType(upload.data_type),
    status: upload.status || '',
    marsYear: upload.mars_year ?? null,
    lsStart: upload.ls_start ?? null,
    lsEnd: upload.ls_end ?? null,
  };
}

export function buildOverviewUploadOptions(uploads = []) {
  const grouped = { mcd: [], openmars: [], nomad: [] };
  for (const upload of uploads || []) {
    const item = normalizeUpload(upload);
    if (!Number.isFinite(item.id) || !USABLE_UPLOAD_STATUSES.has(item.status)) continue;
    if (item.dataType === 'mcd') grouped.mcd.push(item);
    if (item.dataType === 'openmars') grouped.openmars.push(item);
    if (item.dataType === 'nomad') grouped.nomad.push(item);
  }
  return grouped;
}

export function buildOverviewSourceParams({
  mcdUploadId = null,
  openmarsUploadId = null,
  nomadUploadId = null,
} = {}) {
  const params = new URLSearchParams();
  if (mcdUploadId) params.set('mcd_upload_id', String(mcdUploadId));
  if (openmarsUploadId) params.set('openmars_upload_id', String(openmarsUploadId));
  if (nomadUploadId) params.set('nomad_upload_id', String(nomadUploadId));
  return params.toString();
}
```

- [ ] **Step 3: Update API overview URL helpers**

In `frontend/src/services/api.js`, add:

```javascript
function appendQueryParams(url, params) {
  const query = params instanceof URLSearchParams ? params.toString() : String(params || '');
  if (!query) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${query}`;
}

function buildOverviewSourceQuery(options = {}) {
  const params = new URLSearchParams();
  const mcdUploadId = options?.mcdUploadId ?? options?.mcd_upload_id;
  const openmarsUploadId = options?.openmarsUploadId ?? options?.openmars_upload_id;
  const nomadUploadId = options?.nomadUploadId ?? options?.nomad_upload_id;
  if (mcdUploadId) params.set('mcd_upload_id', String(mcdUploadId));
  if (openmarsUploadId) params.set('openmars_upload_id', String(openmarsUploadId));
  if (nomadUploadId) params.set('nomad_upload_id', String(nomadUploadId));
  return params;
}

function appendOverviewSource(url, options = {}) {
  return appendQueryParams(url, buildOverviewSourceQuery(options));
}
```

Update only `fetchOverview*` functions to use `appendOverviewSource()` instead of `appendDataSource()`.

Example:

```javascript
export async function fetchOverviewInfo(options = {}) {
  const res = await authedFetch(appendOverviewSource(`${BASE}/explore/overview/info`, options));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
```

Keep non-overview APIs unchanged in this task.

- [ ] **Step 4: Run frontend pure tests and commit**

Run:

```powershell
node frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js
```

Expected: all tests pass.

Commit:

```powershell
git add frontend/src/services/api.js frontend/src/pages/DataOverviewPage/uploadedSourceOptions.js frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js
git commit -m "feat: add overview uploaded source query helpers"
```

### Task 6: Replace Data Overview Personal Switch With Raw Dataset Selectors

**Files:**
- Modify: `frontend/src/contexts/DataOverviewContext.jsx`
- Modify: `frontend/src/pages/DataOverviewPage.jsx`
- Modify: `frontend/src/pages/DataOverviewPage/SidebarMenu.jsx`
- Modify: `frontend/src/pages/DataOverviewPage/TopStatusBar.jsx`
- Modify: `frontend/src/pages/DataOverviewPage/DetailPanel.jsx`
- Modify: `frontend/src/pages/DataOverviewPage/OverviewCharts/*.jsx`

- [ ] **Step 1: Add context state**

In `frontend/src/contexts/DataOverviewContext.jsx`, replace:

```javascript
const [dataSourceMode, setDataSourceMode] = useState('default');
```

with:

```javascript
const [selectedMcdUploadId, setSelectedMcdUploadId] = useState(null);
const [selectedOpenMarsUploadId, setSelectedOpenMarsUploadId] = useState(null);
const [selectedNomadUploadId, setSelectedNomadUploadId] = useState(null);
```

Add this derived object before `contextValue`:

```javascript
const overviewSourceParams = {
  mcdUploadId: selectedMcdUploadId,
  openmarsUploadId: selectedOpenMarsUploadId,
  nomadUploadId: selectedNomadUploadId,
};
```

Expose these in `contextValue`:

```javascript
selectedMcdUploadId,
setSelectedMcdUploadId,
selectedOpenMarsUploadId,
setSelectedOpenMarsUploadId,
selectedNomadUploadId,
setSelectedNomadUploadId,
overviewSourceParams,
```

Remove `dataSourceMode` and `setDataSourceMode` from `contextValue` after all consumers are updated.

- [ ] **Step 2: Update DataOverviewPage requests**

In `frontend/src/pages/DataOverviewPage.jsx`, remove the `dataSourceMode` login guard.

Read `overviewSourceParams` from context:

```javascript
overviewSourceParams,
```

Pass it to API calls:

```javascript
const d = await fetchOverviewGlobeData(year, ls, variable, ctrl.signal, overviewSourceParams);
const payload = await fetchOverviewOzoneSources(year, ls, overviewSourceParams);
fetchOverviewInfo(overviewSourceParams)
```

Update effect dependency lists from `dataSourceMode` to:

```javascript
overviewSourceParams.mcdUploadId,
overviewSourceParams.openmarsUploadId,
overviewSourceParams.nomadUploadId,
```

Pass `overviewSourceParams` to `DetailPanel`:

```jsx
<DetailPanel sliceData={mcdMainSlice} overviewSourceParams={overviewSourceParams} />
```

- [ ] **Step 3: Replace SidebarMenu source UI**

In `frontend/src/pages/DataOverviewPage/SidebarMenu.jsx`:

Remove imports from `../../utils/personalSourceGuard`.

Import:

```javascript
import { getMyUploads } from '../../services/api';
import { buildOverviewUploadOptions } from './uploadedSourceOptions';
```

Add local upload state:

```javascript
const [rawUploadOptions, setRawUploadOptions] = React.useState({ mcd: [], openmars: [], nomad: [] });
const [rawUploadsLoading, setRawUploadsLoading] = React.useState(false);
```

Read new context values:

```javascript
selectedMcdUploadId,
setSelectedMcdUploadId,
selectedOpenMarsUploadId,
setSelectedOpenMarsUploadId,
selectedNomadUploadId,
setSelectedNomadUploadId,
```

Load uploads when a user exists:

```javascript
React.useEffect(() => {
  if (!user) {
    setRawUploadOptions({ mcd: [], openmars: [], nomad: [] });
    return undefined;
  }
  let active = true;
  setRawUploadsLoading(true);
  getMyUploads()
    .then((uploads) => {
      if (active) setRawUploadOptions(buildOverviewUploadOptions(uploads));
    })
    .catch(() => {
      if (active) setRawUploadOptions({ mcd: [], openmars: [], nomad: [] });
    })
    .finally(() => {
      if (active) setRawUploadsLoading(false);
    });
  return () => {
    active = false;
  };
}, [user?.id]);
```

Replace the default/personal `SegmentedToggle` with:

```jsx
<SelectField
  label={isZh ? '页面 MCD 数据源' : 'Page MCD source'}
  value={selectedMcdUploadId ? String(selectedMcdUploadId) : 'official'}
  onChange={(value) => setSelectedMcdUploadId(value === 'official' ? null : Number(value))}
  options={[
    { value: 'official', label: isZh ? '官方默认 MCD' : 'Official MCD' },
    ...rawUploadOptions.mcd.map((item) => ({
      value: String(item.id),
      label: `${item.filename} · MY ${item.marsYear ?? '--'}`,
    })),
  ]}
  disabled={rawUploadsLoading}
  isLight={isLight}
/>
```

Inside the ozone display section, add:

```jsx
<SelectField
  label={isZh ? 'OpenMARS 臭氧图层' : 'OpenMARS ozone layer'}
  value={selectedOpenMarsUploadId ? String(selectedOpenMarsUploadId) : 'official'}
  onChange={(value) => setSelectedOpenMarsUploadId(value === 'official' ? null : Number(value))}
  options={[
    { value: 'official', label: isZh ? '官方 OpenMARS' : 'Official OpenMARS' },
    ...rawUploadOptions.openmars.map((item) => ({
      value: String(item.id),
      label: `${item.filename} · MY ${item.marsYear ?? '--'}`,
    })),
  ]}
  disabled={rawUploadsLoading}
  isLight={isLight}
/>

<SelectField
  label={isZh ? 'NOMAD 臭氧图层' : 'NOMAD ozone layer'}
  value={selectedNomadUploadId ? String(selectedNomadUploadId) : 'official'}
  onChange={(value) => setSelectedNomadUploadId(value === 'official' ? null : Number(value))}
  options={[
    { value: 'official', label: isZh ? '官方 NOMAD' : 'Official NOMAD' },
    ...rawUploadOptions.nomad.map((item) => ({
      value: String(item.id),
      label: `${item.filename} · MY ${item.marsYear ?? '--'}`,
    })),
  ]}
  disabled={rawUploadsLoading}
  isLight={isLight}
/>
```

- [ ] **Step 4: Update chart prop names**

In `frontend/src/pages/DataOverviewPage/DetailPanel.jsx`, rename the prop:

```javascript
export default function DetailPanel({ sliceData, overviewSourceParams = {} }) {
```

Pass `overviewSourceParams` to chart components:

```jsx
<RealtimeMonitor marsYear={marsYear} lsValue={globalTimeLs} overviewSourceParams={overviewSourceParams} />
<SeasonalChart marsYear={marsYear} overviewSourceParams={overviewSourceParams} />
```

For every overview chart component that currently accepts `dataSourceMode`, rename to `overviewSourceParams` and call APIs with:

```javascript
fetchOverviewSeasonalHeatmap(marsYear, overviewSourceParams)
```

Apply this to:

```text
frontend/src/pages/DataOverviewPage/OverviewCharts/CorrelationMatrix.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/CouplingAnalysis.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/EnvironmentDashboard.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/GlobalTrendLinesChart.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/PolarDynamics.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/RealtimeMonitor.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/SeasonalChart.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/SeasonalExtremesChart.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/SolarSensitivity.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/WaveBandDiagnosticsChart.jsx
frontend/src/pages/DataOverviewPage/OverviewCharts/WaveExplorer.jsx
```

In `frontend/src/pages/DataOverviewPage/OverviewCharts/ResearchDataClient.js`, include upload ids in the cache key:

```javascript
const key = `${marsYear}:${options?.mcdUploadId || 'official'}:${options?.openmarsUploadId || 'official'}:${options?.nomadUploadId || 'official'}`;
```

- [ ] **Step 5: Update top status source label**

In `frontend/src/pages/DataOverviewPage/TopStatusBar.jsx`, replace personal labels with:

```javascript
const sourceLabel = (() => {
  const mode = sourceMeta?.effective_source;
  if (mode === 'user_mcd') {
    return sourceMeta?.upload_filename || (isZh ? '用户 MCD' : 'Uploaded MCD');
  }
  return isZh ? '官方默认 MCD' : 'Official MCD';
})();

const isUserMcd = sourceMeta?.effective_source === 'user_mcd';
```

Use `isUserMcd` for `valueColor`.

- [ ] **Step 6: Run frontend build smoke test and commit**

Run:

```powershell
npm --prefix frontend run build
```

Expected: Vite build completes without JSX or import errors.

Commit:

```powershell
git add frontend/src/contexts/DataOverviewContext.jsx frontend/src/pages/DataOverviewPage.jsx frontend/src/pages/DataOverviewPage/SidebarMenu.jsx frontend/src/pages/DataOverviewPage/TopStatusBar.jsx frontend/src/pages/DataOverviewPage/DetailPanel.jsx frontend/src/pages/DataOverviewPage/OverviewCharts
git commit -m "feat: select raw uploaded datasets in data overview"
```

### Task 7: Reframe Data Management As Raw Overview Dataset Library

**Files:**
- Modify: `frontend/src/pages/ExplorePage.jsx`
- Modify: `frontend/src/pages/ExplorePage/MyDataTab.jsx`
- Create: `frontend/src/pages/ExplorePage/rawDatasetUsage.js`
- Create: `frontend/src/pages/ExplorePage/rawDatasetUsage.test.js`
- Modify: `frontend/src/i18n/zh.js`
- Modify: `frontend/src/i18n/en.js`

- [ ] **Step 1: Write raw usage helper tests**

Create `frontend/src/pages/ExplorePage/rawDatasetUsage.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import { getRawDatasetUsage } from './rawDatasetUsage.js';

test('MCD uploads are full Data Overview page sources', () => {
  const usage = getRawDatasetUsage({ data_type: 'mcd', status: 'valid' }, true);

  assert.equal(usage.key, 'overview_mcd');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['数据总览']);
});

test('OpenMARS uploads are 3D ozone layer sources only', () => {
  const usage = getRawDatasetUsage({ data_type: 'openmars', status: 'valid' }, false);

  assert.equal(usage.key, 'ozone_openmars');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['Data Overview 3D ozone']);
});

test('NOMAD uploads are 3D ozone layer sources only', () => {
  const usage = getRawDatasetUsage({ data_type: 'nomad', status: 'approved' }, false);

  assert.equal(usage.key, 'ozone_nomad');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['Data Overview 3D ozone']);
});

test('invalid uploads are not usable', () => {
  const usage = getRawDatasetUsage({ data_type: 'mcd', status: 'invalid' }, false);

  assert.equal(usage.usable, false);
  assert.deepEqual(usage.pages, []);
});
```

- [ ] **Step 2: Create raw usage helper**

Create `frontend/src/pages/ExplorePage/rawDatasetUsage.js`:

```javascript
const USABLE_STATUSES = new Set(['valid', 'pending_review', 'approved', 'rejected']);

export function getRawDatasetUsage(upload, isZh = true) {
  const type = String(upload?.data_type || '').toLowerCase();
  const status = String(upload?.status || '').toLowerCase();
  if (!USABLE_STATUSES.has(status)) {
    return {
      key: 'unusable',
      usable: false,
      label: isZh ? '暂不可用于可视化' : 'Not usable for visualization',
      desc: isZh ? '该文件未通过校验或状态不可用。' : 'This file has not passed validation or is not in a usable state.',
      pages: [],
    };
  }
  if (type === 'mcd') {
    return {
      key: 'overview_mcd',
      usable: true,
      label: isZh ? '数据总览整页数据源' : 'Full Data Overview source',
      desc: isZh ? '可在数据总览中作为当前 MCD 数据源，驱动右侧图表和球体变量。' : 'Can be selected in Data Overview as the page MCD source.',
      pages: [isZh ? '数据总览' : 'Data Overview'],
    };
  }
  if (type === 'openmars') {
    return {
      key: 'ozone_openmars',
      usable: true,
      label: isZh ? '3D OpenMARS 臭氧图层' : '3D OpenMARS ozone layer',
      desc: isZh ? '只用于数据总览三维球体的臭氧多源展示。' : 'Only used in the Data Overview 3D ozone multi-source display.',
      pages: [isZh ? '数据总览 3D 臭氧' : 'Data Overview 3D ozone'],
    };
  }
  if (type === 'nomad') {
    return {
      key: 'ozone_nomad',
      usable: true,
      label: isZh ? '3D NOMAD 臭氧图层' : '3D NOMAD ozone layer',
      desc: isZh ? '只用于数据总览三维球体的 NOMAD 臭氧观测展示与验证。' : 'Only used in the Data Overview 3D NOMAD ozone display and validation.',
      pages: [isZh ? '数据总览 3D 臭氧' : 'Data Overview 3D ozone'],
    };
  }
  return {
    key: 'unknown',
    usable: false,
    label: isZh ? '未知数据类型' : 'Unknown data type',
    desc: isZh ? '当前仅支持 MCD、OpenMARS、NOMAD。' : 'Only MCD, OpenMARS, and NOMAD are supported.',
    pages: [],
  };
}
```

- [ ] **Step 3: Remove warmup and personal fusion state from MyDataTab**

In `frontend/src/pages/ExplorePage/MyDataTab.jsx`:

Remove imports:

```javascript
import PersonalSourceWarmupBar from '../../components/PersonalSourceWarmupBar';
import { fetchDataInfo, fetchPersonalBuildStatus } from '../../services/api';
```

Add:

```javascript
import { getRawDatasetUsage } from './rawDatasetUsage';
```

Remove state and effects related to:

```javascript
personalSourceInfo
personalBuildStatus
fetchDataInfo({ dataSource: 'personal' })
fetchPersonalBuildStatus()
getBuildStatusKey()
getBuildStatusMeta()
getEffectiveSourceLabel()
getYearModeMeta()
deriveAnalysisCondition()
```

Replace `deriveDatasetState(upload, personalInfo, buildStatus, t)` usage with:

```javascript
const datasetUsage = getRawDatasetUsage(upload, isZh);
```

Render usage pages from:

```javascript
datasetUsage.pages.map((page) => <Badge key={page} label={page} color={C.green} bg="rgba(74,207,172,0.1)" />)
```

Remove:

```jsx
<PersonalSourceWarmupBar status={personalBuildStatus || personalSourceInfo?.source_meta} />
```

- [ ] **Step 4: Update Data Management copy**

In `frontend/src/pages/ExplorePage.jsx`, update view copy:

```javascript
tabMySource: isZh ? '我的原始数据' : 'My Raw Datasets',
tabMySourceDesc: isZh ? '上传 MCD / OpenMARS / NOMAD，用于数据总览可视化' : 'Upload MCD / OpenMARS / NOMAD for Data Overview visualization',
mySourceIntroTitle: isZh ? '数据总览原始数据工作台' : 'Data Overview Raw Dataset Workspace',
mySourceIntroBody: isZh
  ? '这里管理用户上传的原始数据。MCD 可作为数据总览整页数据源，OpenMARS 与 NOMAD 只用于三维臭氧多源展示。'
  : 'This workspace manages raw uploads. MCD can drive the Data Overview page; OpenMARS and NOMAD are only 3D ozone sources.',
```

In `frontend/src/i18n/zh.js` and `frontend/src/i18n/en.js`, replace copy that says uploads feed analysis/prediction/training with copy that says:

```javascript
pageDesc: '数据管理页用于上传 MCD、OpenMARS、NOMAD 原始数据。用户上传的数据只服务数据总览可视化；训练与预测使用管理员在服务器后台维护的数据。',
stepProcessDesc: '系统完成校验后，文件保存在你的原始数据列表中，不再构建个人融合数据源。',
stepUseDesc: 'MCD 可在数据总览作为整页数据源；OpenMARS 与 NOMAD 仅用于三维臭氧多源展示。',
```

Use equivalent English text in `en.js`.

- [ ] **Step 5: Run helper tests and build**

Run:

```powershell
node frontend/src/pages/ExplorePage/rawDatasetUsage.test.js
npm --prefix frontend run build
```

Expected: tests pass and build completes.

Commit:

```powershell
git add frontend/src/pages/ExplorePage.jsx frontend/src/pages/ExplorePage/MyDataTab.jsx frontend/src/pages/ExplorePage/rawDatasetUsage.js frontend/src/pages/ExplorePage/rawDatasetUsage.test.js frontend/src/i18n/zh.js frontend/src/i18n/en.js
git commit -m "refactor: reframe data management as raw overview datasets"
```

### Task 8: Remove Personal Source Controls From Prediction Frontend

**Files:**
- Modify: `frontend/src/pages/PredictPage.jsx`
- Modify: `frontend/src/pages/PredictPage/PredictSidebar.jsx`
- Modify: `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.js`
- Modify: `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js`
- Modify: `frontend/src/pages/PredictPage/WorkflowCanvas/WorkflowConfigPanel.jsx`
- Modify: `frontend/src/pages/PredictPage/WorkflowCanvas/workflowConfig.test.js`
- Modify: `frontend/src/pages/PredictPage/WorkflowCanvas/workflowCompiler.test.js`
- Modify: `frontend/src/pages/PredictPage/WorkflowCanvas/workflowText.js`
- Modify: `frontend/src/pages/PredictPage/WorkflowCanvas/workflowText.test.js`

- [ ] **Step 1: Update cache key tests**

In `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js`, add:

```javascript
test('system prediction metrics key does not include personal data source mode', () => {
  const base = {
    modelMode: 'system',
    selectedVars: ['Temperature'],
    marsYear: 27,
    lsStart: 90,
    horizon: 3,
  };

  assert.equal(
    buildPredictMetricsKey({ ...base, dataSourceMode: 'default' }),
    buildPredictMetricsKey({ ...base, dataSourceMode: 'personal' })
  );
});
```

- [ ] **Step 2: Simplify prediction cache key builder**

In `frontend/src/pages/PredictPage/predictAnalysisCacheKeys.js`, make `buildPredictMetricsKey()` ignore `dataSourceMode`:

```javascript
return `system:default:my:${marsYear}:ls:${lsStart}:h:${horizon}:vars:${normalizeVars(selectedVars)}`;
```

Make `buildErrorDistributionKey()` stop returning `null` for `personal`:

```javascript
return `system:default:vars:${normalizeVars(selectedVars)}`;
```

- [ ] **Step 3: Remove PredictPage personal state**

In `frontend/src/pages/PredictPage.jsx`, remove imports from `../utils/personalSourceGuard`.

Remove state:

```javascript
const [dataSourceMode, setDataSourceMode] = useState(_c.params?.dataSource ?? 'default');
const [switchPreviewMode, setSwitchPreviewMode] = useState(null);
const [sourceMeta, setSourceMeta] = useState(null);
const [availableMarsYears, setAvailableMarsYears] = useState([27, 28]);
const [isSwitchingSource, setIsSwitchingSource] = useState(false);
```

Replace with:

```javascript
const [availableMarsYears, setAvailableMarsYears] = useState([27, 28]);
const [sourceMeta, setSourceMeta] = useState(null);
```

Keep a default info load:

```javascript
useEffect(() => {
  let active = true;
  fetchDataInfo({ dataSource: 'default' })
    .then((info) => {
      if (!active) return;
      const years = Array.isArray(info?.available_years) && info.available_years.length > 0 ? info.available_years : [27, 28];
      setAvailableMarsYears(years);
      setSourceMeta(info?.source_meta || null);
      setMarsYear((prev) => (years.includes(prev) ? prev : years[0]));
    })
    .catch(() => {
      if (!active) return;
      setAvailableMarsYears([27, 28]);
      setSourceMeta(null);
    });
  return () => {
    active = false;
  };
}, [user?.id]);
```

Replace all API calls that use `{ dataSource: dataSourceMode }` with `{ dataSource: 'default' }`.

When saving cache params, set:

```javascript
dataSource: 'default',
```

Pass to `PredictSidebar`:

```jsx
isSwitchingSource={false}
dataSourceMode="default"
setDataSourceMode={() => {}}
sourceMeta={sourceMeta}
personalSourceDisabled={true}
personalSourceHint=""
```

- [ ] **Step 4: Remove PredictSidebar data source control**

In `frontend/src/pages/PredictPage/PredictSidebar.jsx`, remove `ToggleSwitch()` and remove the whole `canShowDataSourceControl` block that renders the default/personal control.

Change the parameters subtitle:

```javascript
subtitle={isZh ? '调整火星年和起始太阳黄经。预测数据由服务器后台维护。' : 'Adjust Mars year and starting solar longitude. Prediction data is server-managed.'}
```

- [ ] **Step 5: Remove personal from workflow source options**

In workflow files, replace personal/default source choices with a single server-managed source.

In `WorkflowConfigPanel.jsx`, replace:

```jsx
<option value="personal">{text.source.personalOption}</option>
```

with no personal option.

In workflow tests, change expected compiled data source from `personal` to `default`.

In `workflowText.js`, replace `"Default / personal"` with:

```javascript
[WORKFLOW_NODE_TYPES.DATA_SOURCE]: 'Server-managed data'
```

and remove or stop using `personalOption`.

- [ ] **Step 6: Run tests and build**

Run:

```powershell
node frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js
node frontend/src/pages/PredictPage/WorkflowCanvas/workflowConfig.test.js
node frontend/src/pages/PredictPage/WorkflowCanvas/workflowCompiler.test.js
node frontend/src/pages/PredictPage/WorkflowCanvas/workflowText.test.js
npm --prefix frontend run build
```

Expected: tests pass and build completes.

Commit:

```powershell
git add frontend/src/pages/PredictPage.jsx frontend/src/pages/PredictPage/PredictSidebar.jsx frontend/src/pages/PredictPage/predictAnalysisCacheKeys.js frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js frontend/src/pages/PredictPage/WorkflowCanvas
git commit -m "refactor: remove personal data source from prediction UI"
```

### Task 9: Remove Personal Source Controls From Model Training Frontend

**Files:**
- Modify: `frontend/src/pages/ModelTrainingPage.jsx`
- Modify: `frontend/src/services/api.js`
- Modify: `frontend/src/i18n/zh.js`
- Modify: `frontend/src/i18n/en.js`

- [ ] **Step 1: Force training API calls to default data source**

In `frontend/src/services/api.js`, change `startTrainingTask()` signature:

```javascript
export async function startTrainingTask(
  model_script,
  hyperparameters,
  model_name = null,
  data_source = 'default',
  options = {}
) {
```

to:

```javascript
export async function startTrainingTask(
  model_script,
  hyperparameters,
  model_name = null,
  options = {}
) {
```

Change request body:

```javascript
data_source: 'default',
```

- [ ] **Step 2: Remove ModelTrainingPage personal imports and state**

In `frontend/src/pages/ModelTrainingPage.jsx`, remove imports from `../utils/personalSourceGuard`.

Remove state:

```javascript
const [isSwitchingSource, setIsSwitchingSource] = useState(false);
const [dataSourceMode, setDataSourceMode] = useState('default');
const [switchPreviewMode, setSwitchPreviewMode] = useState(null);
const [sourceMeta, setSourceMeta] = useState(null);
```

Remove effects and handlers that call:

```javascript
fetchDataInfo({ dataSource: dataSourceMode })
getPersonalSourceAvailability()
handleDataSourceModeChange()
```

Set constants near other derived values:

```javascript
const dataSourceMode = 'default';
const isSwitchingSource = false;
```

- [ ] **Step 3: Remove training source toggle markup**

Remove the button grid that renders:

```javascript
[
  { value: 'default', label: copy.sourceDefault },
  { value: 'personal', label: copy.sourcePersonal },
]
```

Replace it with a static information card:

```jsx
<div style={{ ...fieldHintStyle, marginTop: 0 }}>
  {isZh
    ? '训练数据由服务器后台维护。用户上传的 MCD / OpenMARS / NOMAD 只用于数据总览可视化。'
    : 'Training data is maintained on the server. User-uploaded MCD / OpenMARS / NOMAD is only used in Data Overview.'}
</div>
```

Update `handleStartTraining()` call:

```javascript
const task = await startTrainingTask(
  apiModelScript,
  hyperparameters,
  customModelName.trim(),
  {
    modelSource,
    uploadedModelId: modelSource === 'uploaded' ? selectedUploadedModelId : null,
  }
);
```

- [ ] **Step 4: Update copy and historical task labels**

Keep `getSourceModeLabel()` able to display historical `personal` tasks:

```javascript
function getSourceModeLabel(source, copy) {
  if (!source) return '--';
  if (source === 'personal') return copy.sourceHistoricalPersonal;
  return copy.sourceDefault;
}
```

In `copy`, replace:

```javascript
sourcePersonal: isZh ? '个人 / 混合数据' : 'Personal / mixed source',
sourceHintPersonal: ...
```

with:

```javascript
sourceHistoricalPersonal: isZh ? '历史个人数据任务' : 'Historical personal-data task',
sourceHintDefault: isZh
  ? '当前训练使用服务器后台维护的数据源。'
  : 'Training uses server-managed datasets.',
```

- [ ] **Step 5: Run build and commit**

Run:

```powershell
npm --prefix frontend run build
```

Expected: build completes and `sourcePersonal`, `sourceHintPersonal`, and personal guard imports are gone.

Commit:

```powershell
git add frontend/src/pages/ModelTrainingPage.jsx frontend/src/services/api.js frontend/src/i18n/zh.js frontend/src/i18n/en.js
git commit -m "refactor: remove personal source from training UI"
```

### Task 10: Remove Dead Personal Warmup Frontend Code And Legacy Backend Endpoint

**Files:**
- Delete: `frontend/src/utils/personalSourceGuard.js`
- Delete: `frontend/src/components/PersonalSourceWarmupBar.jsx`
- Modify: `frontend/src/services/api.js`
- Modify: `AresVision_backend/backend/routers/analysis.py`

- [ ] **Step 1: Verify no frontend imports remain**

Run:

```powershell
rg -n "personalSourceGuard|PersonalSourceWarmupBar|fetchPersonalBuildStatus|prewarmPredictSource|getPersonalSource" frontend/src
```

Expected before this task: only definitions remain, no component/page imports.

- [ ] **Step 2: Remove dead frontend files and API functions**

Delete:

```text
frontend/src/utils/personalSourceGuard.js
frontend/src/components/PersonalSourceWarmupBar.jsx
```

In `frontend/src/services/api.js`, remove:

```javascript
export async function fetchPersonalBuildStatus() { ... }
export async function prewarmPredictSource(marsYear = 27, options = {}) { ... }
```

- [ ] **Step 3: Deprecate backend personal build status endpoint**

In `AresVision_backend/backend/routers/analysis.py`, replace `get_personal_build_status()` with:

```python
@router.get("/personal-build-status")
async def get_personal_build_status():
    raise HTTPException(
        status_code=410,
        detail="personal source warmup has been retired; user uploads are available only through Data Overview raw dataset selectors",
    )
```

Keep `/explore/info` default behavior if other pages still call it for official years. Ensure it rejects `data_source=personal` with `_normalize_source()` or a dedicated legacy error after Task 4.

- [ ] **Step 4: Run searches and build**

Run:

```powershell
rg -n "personalSourceGuard|PersonalSourceWarmupBar|fetchPersonalBuildStatus|prewarmPredictSource|getPersonalSource" frontend/src
npm --prefix frontend run build
```

Expected: `rg` returns no matches in frontend source, and build completes.

Commit:

```powershell
git add frontend/src AresVision_backend/backend/routers/analysis.py
git rm frontend/src/utils/personalSourceGuard.js frontend/src/components/PersonalSourceWarmupBar.jsx
git commit -m "chore: remove retired personal source warmup UI"
```

### Task 11: Full Verification And Regression Sweep

**Files:**
- No planned source edits unless verification exposes a concrete bug.

- [ ] **Step 1: Run targeted backend tests**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_raw_upload_classification.py AresVision_backend/backend/tests/test_user_overview_source_service.py AresVision_backend/backend/tests/test_analysis_overview_uploaded_sources.py AresVision_backend/backend/tests/test_analysis_overview_routes.py AresVision_backend/backend/tests/test_personal_source_disabled_contract.py AresVision_backend/backend/tests/test_data_management_responsiveness.py -q
```

Expected: all targeted backend tests pass.

- [ ] **Step 2: Run training/prediction contract tests**

Run:

```powershell
python -m pytest AresVision_backend/backend/tests/test_training_channel_contract.py AresVision_backend/backend/tests/test_training_personal_inference_env.py AresVision_backend/backend/tests/test_trained_model_predict_contract.py AresVision_backend/backend/tests/test_uploaded_training_contract.py -q
```

Expected: all selected contract tests pass. Historical `personal` task tests should now assert no personal data directory rebuild.

- [ ] **Step 3: Run frontend pure tests**

Run:

```powershell
node frontend/src/pages/DataOverviewPage/uploadedSourceOptions.test.js
node frontend/src/pages/ExplorePage/rawDatasetUsage.test.js
node frontend/src/pages/PredictPage/predictAnalysisCacheKeys.test.js
node frontend/src/pages/DataOverviewPage/overviewSceneModel.test.js
```

Expected: all Node tests pass.

- [ ] **Step 4: Run frontend build**

Run:

```powershell
npm --prefix frontend run build
```

Expected: Vite build completes without missing imports.

- [ ] **Step 5: Search for retired user-facing concepts**

Run:

```powershell
rg -n "个人 / 混合|personal / mixed|personal source warmup|PersonalSourceWarmupBar|data_source=personal|fetchPersonalBuildStatus|personal_mcd_plus_system_openmars|personal_full_year" frontend/src AresVision_backend/backend
```

Expected: matches are limited to backend deprecated `PersonalDataSourceService`, historical migration comments, or tests that explicitly verify legacy rejection. No active page should show personal/mixed source as a selectable user feature.

- [ ] **Step 6: Manual smoke test**

Start backend and frontend in the project’s usual dev setup.

Check these flows:

```text
1. Open Data Overview while logged out.
2. Confirm it defaults to official MCD and right-side charts load.
3. Log in and upload a valid MCD file in Data Management.
4. Confirm no personal warmup/progress bar appears.
5. Select the uploaded MCD in Data Overview and confirm globe plus right-side charts refresh.
6. Upload/select OpenMARS and NOMAD, then use 3D ozone multi-source, validation, and diff modes.
7. Open Prediction and confirm there is no personal source switch.
8. Run a default prediction and confirm network requests do not include data_source=personal.
9. Open Model Training and confirm there is no personal source switch.
10. Start a training task and confirm request payload sends data_source='default'.
```

- [ ] **Step 7: Final commit for verification fixes**

If verification required small fixes, commit them:

```powershell
git add <changed-files>
git commit -m "fix: polish raw overview dataset migration"
```

If no fixes were required, do not create an empty commit.

## Self-Review Notes

Spec coverage:

- Official Data Overview remains default: Tasks 3, 5, and 6.
- Uploaded MCD drives full Data Overview: Tasks 2, 3, 5, and 6.
- Uploaded OpenMARS/NOMAD only drive 3D ozone layers: Tasks 2, 3, 5, and 6.
- Training/prediction no longer use ordinary uploaded data: Tasks 4, 8, and 9.
- Upload no longer triggers personal fusion cache rebuild: Task 1.
- Data Management copy no longer promises prediction/training use: Task 7.
- Personal warmup UI and frontend guard removal: Task 10.
- Verification of freeze-risk and contracts: Task 11.

Risk notes:

- `PersonalDataSourceService` remains in backend for one migration pass, but no ordinary upload or frontend path should trigger it after these tasks.
- Some historical training records may still show `_data_source=personal`; the plan keeps display compatibility but prevents rebuild/use.
- Uploaded MCD full-page support depends on the file containing `o3col` plus MCD overview variables. If a user uploads an MCD file without `o3col`, the overview route returns a clear missing-field error for ozone-dependent charts.
