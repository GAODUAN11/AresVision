/**
 * In-memory PredictPage cache. Prediction state is always isolated by identity;
 * presentation-only preferences are shared for the lifetime of the SPA.
 */

export const ANONYMOUS_PREDICT_SCOPE = 'anonymous';

const DEFAULT_SENSITIVE_CACHE = Object.freeze({
  resultContextKey: null,
  results: null,
  metrics: null,
  errorDistData: null,
  performanceData: null,
  performanceKey: null,
  params: null,
  predictionMode: 'workflow',
  activeHorizon: 0,
  compareConfigs: [],
  selectedCompareIds: [],
  pfiData: null,
  metricsKey: null,
  errorDistKey: null,
  pfiKey: null,
  selectedCompareTrainingTaskIds: [],
  compareTrainingMetricsData: null,
  compareTrainingMetricsKey: null,
  compareTrainingErrorData: null,
  compareTrainingErrorKey: null,
  compareTrainingPfiData: null,
  compareTrainingPfiKey: null,
  workflowGraph: null,
  workflowConfig: null,
  error: null,
  loading: false,
  metricsLoading: false,
  errorDistLoading: false,
  pfiLoading: false,
  perfLoading: false,
  compareTrainingLoading: false,
  compareTrainingErrorLoading: false,
  compareTrainingPfiLoading: false,
});

const SENSITIVE_CACHE_KEYS = new Set(Object.keys(DEFAULT_SENSITIVE_CACHE));
const scopedCaches = new Map();
const uiPreferences = {
  viewMode: 'triptych',
};

const EMPTY_PREDICTION_RESULT_CACHE = Object.freeze({
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

function isValidPredictScope(scope) {
  return scope === ANONYMOUS_PREDICT_SCOPE
    || (typeof scope === 'string' && scope.startsWith('user:') && scope.length > 5);
}

function createSensitiveCache() {
  return {
    ...DEFAULT_SENSITIVE_CACHE,
    compareConfigs: [],
    selectedCompareIds: [],
    selectedCompareTrainingTaskIds: [],
  };
}

export function createUserPredictScope(userId) {
  const normalized = String(userId ?? '').trim();
  return normalized ? `user:${normalized}` : null;
}

export function resolvePredictCacheScope({ user, isLoading } = {}) {
  if (isLoading) return null;
  return user?.id != null
    ? createUserPredictScope(user.id)
    : ANONYMOUS_PREDICT_SCOPE;
}

export function getEmptyPredictCache(scope = null) {
  return {
    scope: isValidPredictScope(scope) ? scope : null,
    ...createSensitiveCache(),
    ...uiPreferences,
  };
}

export function getPredictCache(scope) {
  if (!isValidPredictScope(scope)) return getEmptyPredictCache();
  const cache = scopedCaches.get(scope);
  return {
    scope,
    ...(cache || createSensitiveCache()),
    ...uiPreferences,
  };
}

export function setPredictCache(scope, updates) {
  if (!isValidPredictScope(scope) || !updates || typeof updates !== 'object') return false;

  const cache = scopedCaches.get(scope) || createSensitiveCache();
  Object.entries(updates).forEach(([key, value]) => {
    if (SENSITIVE_CACHE_KEYS.has(key)) cache[key] = value;
  });
  scopedCaches.set(scope, cache);
  return true;
}

export function setPredictUiPreferences(updates) {
  if (!updates || typeof updates !== 'object') return;
  if (typeof updates.viewMode === 'string' && updates.viewMode) {
    uiPreferences.viewMode = updates.viewMode;
  }
}

export function getPredictionResultCacheForContext(
  cacheSnapshot,
  expectedScope,
  contextKey,
  expectedAnalysisKeys = {}
) {
  if (!isValidPredictScope(expectedScope)
    || !contextKey
    || cacheSnapshot?.scope !== expectedScope
    || cacheSnapshot?.resultContextKey !== contextKey) {
    return { ...EMPTY_PREDICTION_RESULT_CACHE };
  }

  const contextMatches = (key) => Boolean(expectedAnalysisKeys[key])
    && cacheSnapshot[key] === expectedAnalysisKeys[key];
  const metricsContextMatches = contextMatches('metricsKey');
  const errorDistContextMatches = contextMatches('errorDistKey');
  const pfiContextMatches = contextMatches('pfiKey');
  const performanceContextMatches = contextMatches('performanceKey');

  return {
    resultContextKey: cacheSnapshot.resultContextKey,
    results: cacheSnapshot.results ?? null,
    metrics: metricsContextMatches ? cacheSnapshot.metrics ?? null : null,
    errorDistData: errorDistContextMatches ? cacheSnapshot.errorDistData ?? null : null,
    pfiData: pfiContextMatches ? cacheSnapshot.pfiData ?? null : null,
    performanceData: performanceContextMatches ? cacheSnapshot.performanceData ?? null : null,
    performanceKey: performanceContextMatches ? cacheSnapshot.performanceKey : null,
    metricsKey: metricsContextMatches ? cacheSnapshot.metricsKey : null,
    errorDistKey: errorDistContextMatches ? cacheSnapshot.errorDistKey : null,
    pfiKey: pfiContextMatches ? cacheSnapshot.pfiKey : null,
    activeHorizon: cacheSnapshot.activeHorizon ?? 0,
  };
}

export function clearPredictCache(scope) {
  if (!isValidPredictScope(scope)) return false;
  return scopedCaches.delete(scope);
}
