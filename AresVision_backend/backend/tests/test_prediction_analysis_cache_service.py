import asyncio
import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from database.engine import Base
from database.models import ModelTrainingTask, PredictionAnalysisCache, User
from services.prediction_analysis_cache import PredictionAnalysisCacheService


def _metric(value):
    return {
        "overall": {
            "step": 0,
            "rmse": value,
            "mae": value,
            "ssim": 0.5,
            "r2": 0.5,
        },
        "per_step": [],
    }


async def _database(tmp_path):
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{tmp_path / 'cache.db'}"
    )
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    openmars = tmp_path / "openmars"
    mcd = tmp_path / "mcd"
    openmars.mkdir(exist_ok=True)
    mcd.mkdir(exist_ok=True)
    (openmars / "MY27.nc").write_bytes(b"openmars")
    (mcd / "MY27.nc").write_bytes(b"mcd")
    data_dirs = {
        "ARESVISION_OPENMARS_DIR": str(openmars),
        "ARESVISION_MCD_DIR": str(mcd),
    }

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with sessions() as session:
        user_a = User(
            email="a@example.com", username="A", password_hash="x"
        )
        user_b = User(
            email="b@example.com", username="B", password_hash="x"
        )
        session.add_all([user_a, user_b])
        await session.flush()
        model_path = tmp_path / "model.pth"
        model_path.write_bytes(b"weights")
        task = ModelTrainingTask(
            user_id=user_a.id,
            model_script="demo3.py",
            hyperparameters=json.dumps({"horizon": 3}),
            status="completed",
            output_model_path=str(model_path),
        )
        session.add(task)
        await session.commit()

    return engine, sessions, user_a.id, user_b.id, task, data_dirs


def test_ready_result_persists_across_service_instances(tmp_path):
    async def run():
        engine, sessions, user_a, _user_b, task, data_dirs = (
            await _database(tmp_path)
        )
        calls = 0

        async def compute():
            nonlocal calls
            calls += 1
            return _metric(1.25)

        kwargs = {
            "user_id": user_a,
            "task": task,
            "analysis_type": "metrics",
            "request_params": {"horizon": 3},
            "data_dirs": data_dirs,
            "compute": compute,
        }
        first = await PredictionAnalysisCacheService(
            sessions
        ).get_or_compute(**kwargs)
        second = await PredictionAnalysisCacheService(
            sessions
        ).get_or_compute(**kwargs)
        await engine.dispose()
        return calls, first, second

    calls, first, second = asyncio.run(run())
    assert calls == 1
    assert first == second == _metric(1.25)


def test_cache_rows_are_isolated_by_requesting_account(tmp_path):
    async def run():
        engine, sessions, user_a, user_b, task, data_dirs = (
            await _database(tmp_path)
        )
        calls = 0

        async def compute():
            nonlocal calls
            calls += 1
            return _metric(float(calls))

        service = PredictionAnalysisCacheService(sessions)
        common = {
            "task": task,
            "analysis_type": "metrics",
            "request_params": {"horizon": 3},
            "data_dirs": data_dirs,
            "compute": compute,
        }
        await service.get_or_compute(user_id=user_a, **common)
        await service.get_or_compute(user_id=user_b, **common)
        async with sessions() as session:
            rows = (
                await session.execute(select(PredictionAnalysisCache))
            ).scalars().all()
        await engine.dispose()
        return calls, {(row.user_id, row.status) for row in rows}

    calls, rows = asyncio.run(run())
    assert calls == 2
    assert len(rows) == 2
    assert all(status == "ready" for _user_id, status in rows)
