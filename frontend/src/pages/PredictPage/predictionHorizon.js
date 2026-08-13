import {
  PREDICT_MODEL_MODE_COMPARE,
  PREDICT_MODEL_MODE_TRAINED,
} from './predictModelModes.js';

export const TRAINING_HORIZON_MAX = 30;

function parseHyperparameters(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getTaskPredictionHorizon(task) {
  const hyperparameters = parseHyperparameters(task?.hyperparameters);
  const horizon = hyperparameters?.horizon;
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > TRAINING_HORIZON_MAX) return null;
  return horizon;
}

export function resolvePredictionHorizonLimit({ modelMode, selectedTask, selectedTasks = [] } = {}) {
  if (modelMode === PREDICT_MODEL_MODE_TRAINED) {
    return getTaskPredictionHorizon(selectedTask);
  }
  if (modelMode !== PREDICT_MODEL_MODE_COMPARE || selectedTasks.length < 2) return null;

  const horizons = selectedTasks.map(getTaskPredictionHorizon);
  if (horizons.some((horizon) => horizon == null)) return null;
  return Math.min(...horizons);
}

export function clampPredictionHorizon(value, maximum) {
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > TRAINING_HORIZON_MAX) return null;
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? Math.round(parsed) : 1;
  return Math.max(1, Math.min(maximum, normalized));
}
