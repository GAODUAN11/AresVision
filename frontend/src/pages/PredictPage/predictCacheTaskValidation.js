const EMPTY_SINGLE_MODEL_STATE = Object.freeze({
  resultContextKey: null,
  results: null,
  metrics: null,
  errorDistData: null,
  pfiData: null,
  performanceData: null,
  performanceKey: null,
  metricsKey: null,
  errorDistKey: null,
  pfiKey: null,
  activeHorizon: 0,
});

const EMPTY_COMPARE_MODEL_STATE = Object.freeze({
  compareTrainingMetricsData: null,
  compareTrainingMetricsKey: null,
  compareTrainingErrorData: null,
  compareTrainingErrorKey: null,
  compareTrainingPfiData: null,
  compareTrainingPfiKey: null,
});

function normalizeTaskIds(taskIds) {
  return [...new Set((Array.isArray(taskIds) ? taskIds : [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0))]
    .sort((a, b) => a - b);
}

export function validatePredictCacheTrainingTasks(snapshot, accessibleTaskIds = []) {
  const accessible = new Set(normalizeTaskIds(accessibleTaskIds));
  const params = { ...(snapshot?.params || {}) };
  const isAuthenticatedScope = typeof snapshot?.scope === 'string'
    && snapshot.scope.startsWith('user:');
  const selectedTaskId = Number(params.trainingTaskId);
  const hasSelectedTaskReference = Number.isFinite(selectedTaskId) && selectedTaskId > 0;
  const usesTrainedModel = params.modelMode === 'trained';
  const hasAccessibleSelectedTask = isAuthenticatedScope
    && hasSelectedTaskReference
    && accessible.has(selectedTaskId);

  const cachedCompareIds = normalizeTaskIds(
    snapshot?.selectedCompareTrainingTaskIds?.length
      ? snapshot.selectedCompareTrainingTaskIds
      : params.compareTrainingTaskIds
  );
  const validCompareIds = isAuthenticatedScope
    ? cachedCompareIds.filter((id) => accessible.has(id))
    : [];
  const compareSelectionChanged = validCompareIds.length !== cachedCompareIds.length;

  let validated = {
    ...snapshot,
    params: {
      ...params,
      trainingTaskId: hasAccessibleSelectedTask ? selectedTaskId : null,
      compareTrainingTaskIds: validCompareIds,
    },
    selectedCompareTrainingTaskIds: validCompareIds,
  };

  if ((hasSelectedTaskReference || usesTrainedModel) && !hasAccessibleSelectedTask) {
    validated = { ...validated, ...EMPTY_SINGLE_MODEL_STATE };
  }
  if (!isAuthenticatedScope || compareSelectionChanged) {
    validated = { ...validated, ...EMPTY_COMPARE_MODEL_STATE };
  }

  return validated;
}
