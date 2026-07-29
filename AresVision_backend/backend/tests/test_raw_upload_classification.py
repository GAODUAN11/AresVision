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
