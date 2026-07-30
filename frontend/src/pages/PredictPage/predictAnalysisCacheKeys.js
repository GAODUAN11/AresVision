function normalizeVars(vars = []) {
  return (Array.isArray(vars) ? vars : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .sort()
    .join(',');
}

export function buildPredictMetricsKey({
  modelMode,
  trainingTaskId,
  horizon,
  selectedVars,
  marsYear,
  lsStart,
}) {
  if (modelMode === 'trained') {
    return trainingTaskId ? `trained:${trainingTaskId}:h:${horizon}` : null;
  }
  return `system:default:my:${marsYear}:ls:${lsStart}:h:${horizon}:vars:${normalizeVars(selectedVars)}`;
}

export function buildErrorDistributionKey({
  modelMode,
  trainingTaskId,
  horizon,
  selectedVars,
}) {
  if (modelMode === 'trained') {
    return trainingTaskId ? `trained:${trainingTaskId}:h:${horizon}` : null;
  }
  return `system:default:vars:${normalizeVars(selectedVars)}`;
}

export function buildPermutationImportanceKey({
  modelMode,
  trainingTaskId,
  horizon,
  selectedVars,
}) {
  if (modelMode === 'trained') {
    return trainingTaskId ? `trained:${trainingTaskId}:h:${horizon}:vars:${normalizeVars(selectedVars)}` : null;
  }
  return `system:vars:${normalizeVars(selectedVars)}`;
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
