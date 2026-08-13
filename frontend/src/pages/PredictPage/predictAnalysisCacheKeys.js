function normalizeVars(vars = []) {
  return [...new Set((Array.isArray(vars) ? vars : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
    .sort();
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizePredictionContext({
  modelMode,
  trainingTaskId,
  horizon,
  selectedVars,
  marsYear,
  lsStart,
} = {}) {
  return {
    modelMode: String(modelMode || '').trim(),
    trainingTaskId: normalizePositiveNumber(trainingTaskId),
    horizon: normalizePositiveNumber(horizon),
    marsYear: normalizeFiniteNumber(marsYear),
    lsStart: normalizeFiniteNumber(lsStart),
    selectedVars: normalizeVars(selectedVars),
  };
}

export function buildPredictionContextKey(context) {
  const normalized = normalizePredictionContext(context);
  return [
    `mode:${normalized.modelMode}`,
    `task:${normalized.trainingTaskId ?? 'none'}`,
    `h:${normalized.horizon ?? 'none'}`,
    `my:${normalized.marsYear ?? 'none'}`,
    `ls:${normalized.lsStart ?? 'none'}`,
    `vars:${normalized.selectedVars.join(',')}`,
  ].join('|');
}

export function isPredictionCacheContextCurrent(cacheContextKey, context) {
  return Boolean(cacheContextKey) && cacheContextKey === buildPredictionContextKey(context);
}

function buildAnalysisKey(type, context) {
  const normalized = normalizePredictionContext(context);
  if (normalized.modelMode === 'trained' && !normalized.trainingTaskId) return null;
  return `${type}:${buildPredictionContextKey(normalized)}`;
}

export function buildPredictMetricsKey(context) {
  return buildAnalysisKey('metrics', context);
}

export function buildErrorDistributionKey(context) {
  return buildAnalysisKey('error-distribution', context);
}

export function buildPermutationImportanceKey(context) {
  return buildAnalysisKey('pfi', context);
}

export function buildTrainingModelCompareKey({ taskIds, horizon, compareType = 'metrics' }) {
  const ids = (Array.isArray(taskIds) ? taskIds : [])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length < 2) return null;
  return `compare:${uniqueIds.join(',')}:h:${horizon}:type:${compareType}`;
}
