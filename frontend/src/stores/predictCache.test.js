import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANONYMOUS_PREDICT_SCOPE,
  clearPredictCache,
  createUserPredictScope,
  getPredictCache,
  getPredictionResultCacheForContext,
  resolvePredictCacheScope,
  setPredictCache,
  setPredictUiPreferences,
} from './predictCache.js';

const userA = createUserPredictScope(101);
const userB = createUserPredictScope(202);

function resetScopes() {
  clearPredictCache(userA);
  clearPredictCache(userB);
  clearPredictCache(ANONYMOUS_PREDICT_SCOPE);
  setPredictUiPreferences({ viewMode: 'triptych' });
}

test.beforeEach(resetScopes);

test('predict cache defaults to workflow mode so the new canvas is immediately visible', () => {
  const snapshot = getPredictCache(userA);

  assert.equal(snapshot.scope, userA);
  assert.equal(snapshot.predictionMode, 'workflow');
  assert.equal(snapshot.resultContextKey, null);
});

test('user A cache cannot be read or overwritten by user B', () => {
  setPredictCache(userA, {
    results: { owner: 'A' },
    metrics: { rmse: 1 },
    params: { trainingTaskId: 42 },
  });
  setPredictCache(userB, { results: { owner: 'B' } });

  assert.deepEqual(getPredictCache(userA).results, { owner: 'A' });
  assert.deepEqual(getPredictCache(userA).metrics, { rmse: 1 });
  assert.deepEqual(getPredictCache(userB).results, { owner: 'B' });
  assert.equal(getPredictCache(userB).metrics, null);
  assert.equal(getPredictCache(userB).params, null);
});

test('anonymous scope cannot read a signed-in user cache', () => {
  setPredictCache(userA, { results: { owner: 'A' }, selectedCompareTrainingTaskIds: [42, 43] });

  const anonymous = getPredictCache(ANONYMOUS_PREDICT_SCOPE);
  assert.equal(anonymous.results, null);
  assert.deepEqual(anonymous.selectedCompareTrainingTaskIds, []);
});

test('signed-in users cannot read anonymous prediction results', () => {
  setPredictCache(ANONYMOUS_PREDICT_SCOPE, {
    results: { owner: 'anonymous' },
    metrics: { rmse: 9 },
  });

  assert.equal(getPredictCache(userA).results, null);
  assert.equal(getPredictCache(userA).metrics, null);
});

test('unresolved authentication has no cache scope and cannot read or write data', () => {
  setPredictCache(userA, { results: { owner: 'A' } });

  assert.equal(resolvePredictCacheScope({ user: null, isLoading: true }), null);
  assert.equal(setPredictCache(null, { results: { owner: 'unknown' } }), false);
  assert.equal(getPredictCache(null).scope, null);
  assert.equal(getPredictCache(null).results, null);
  assert.deepEqual(getPredictCache(userA).results, { owner: 'A' });
});

test('authentication state resolves to stable user and anonymous scopes without tokens', () => {
  assert.equal(resolvePredictCacheScope({ user: { id: 101 }, isLoading: false }), 'user:101');
  assert.equal(resolvePredictCacheScope({ user: null, isLoading: false }), ANONYMOUS_PREDICT_SCOPE);
  assert.equal(createUserPredictScope(null), null);
  assert.equal(createUserPredictScope(''), null);
});

test('prediction cache restores the complete result bundle only for matching scope and context', () => {
  const contextKey = 'mode:trained|task:42|h:3|my:27|ls:90|vars:Temperature';
  setPredictCache(userA, {
    resultContextKey: contextKey,
    results: { model: 42 },
    metrics: { rmse: 1 },
    errorDistData: { bins: [1] },
    pfiData: { Temperature: 0.5 },
    performanceData: { results: { current: { rmse: 1 } } },
    performanceKey: 'performance-key',
    metricsKey: 'metrics-key',
    errorDistKey: 'error-key',
    pfiKey: 'pfi-key',
    activeHorizon: 2,
  });

  assert.deepEqual(
    getPredictionResultCacheForContext(
      getPredictCache(userA),
      userA,
      contextKey,
      {
        metricsKey: 'metrics-key',
        errorDistKey: 'error-key',
        pfiKey: 'pfi-key',
        performanceKey: 'performance-key',
      }
    ),
    {
      resultContextKey: contextKey,
      results: { model: 42 },
      metrics: { rmse: 1 },
      errorDistData: { bins: [1] },
      pfiData: { Temperature: 0.5 },
      performanceData: { results: { current: { rmse: 1 } } },
      performanceKey: 'performance-key',
      metricsKey: 'metrics-key',
      errorDistKey: 'error-key',
      pfiKey: 'pfi-key',
      activeHorizon: 2,
    }
  );

  assert.equal(
    getPredictionResultCacheForContext(getPredictCache(userA), userB, contextKey).results,
    null
  );
  assert.equal(
    getPredictionResultCacheForContext(getPredictCache(userA), userA, 'other-context').results,
    null
  );
});

test('performance comparison cache requires its exact request context', () => {
  setPredictCache(userA, {
    resultContextKey: 'prediction-context',
    performanceData: { results: { modelA: { rmse: 1 } } },
    performanceKey: 'prediction-context|performance:modelA',
  });

  const snapshot = getPredictCache(userA);
  assert.equal(
    getPredictionResultCacheForContext(
      snapshot,
      userA,
      'prediction-context',
      { performanceKey: 'prediction-context|performance:modelA' }
    ).performanceKey,
    'prediction-context|performance:modelA'
  );
  assert.notEqual(snapshot.performanceKey, 'prediction-context|performance:modelB');
  assert.deepEqual(
    getPredictionResultCacheForContext(
      snapshot,
      userA,
      'prediction-context',
      { performanceKey: 'prediction-context|performance:modelB' }
    ).performanceData,
    null
  );
});

test('analysis payloads are discarded when their individual request keys do not match', () => {
  setPredictCache(userA, {
    resultContextKey: 'prediction-context',
    results: { owner: 'A' },
    metrics: { rmse: 1 },
    metricsKey: 'metrics:old',
    errorDistData: { bins: [1] },
    errorDistKey: 'errors:old',
    pfiData: { Temperature: 0.5 },
    pfiKey: 'pfi:old',
  });

  const restored = getPredictionResultCacheForContext(
    getPredictCache(userA),
    userA,
    'prediction-context',
    {
      metricsKey: 'metrics:new',
      errorDistKey: 'errors:new',
      pfiKey: 'pfi:new',
    }
  );

  assert.deepEqual(restored.results, { owner: 'A' });
  assert.equal(restored.metrics, null);
  assert.equal(restored.metricsKey, null);
  assert.equal(restored.errorDistData, null);
  assert.equal(restored.errorDistKey, null);
  assert.equal(restored.pfiData, null);
  assert.equal(restored.pfiKey, null);
});

test('clearing user A removes all sensitive cache state without touching user B or UI preferences', () => {
  setPredictUiPreferences({ viewMode: 'globe' });
  setPredictCache(userA, {
    results: { owner: 'A' },
    selectedCompareTrainingTaskIds: [42, 43],
    compareTrainingMetricsData: { models: ['A'] },
    workflowGraph: { nodes: [{ id: 'private' }] },
  });
  setPredictCache(userB, { results: { owner: 'B' } });

  clearPredictCache(userA);

  const cleared = getPredictCache(userA);
  assert.equal(cleared.results, null);
  assert.deepEqual(cleared.selectedCompareTrainingTaskIds, []);
  assert.equal(cleared.compareTrainingMetricsData, null);
  assert.equal(cleared.workflowGraph, null);
  assert.equal(cleared.viewMode, 'globe');
  assert.deepEqual(getPredictCache(userB).results, { owner: 'B' });
});

test('cache ignores tokens and unknown fields', () => {
  setPredictCache(userA, {
    results: { owner: 'A' },
    token: 'secret-token',
    accessToken: 'other-secret',
  });

  const snapshot = getPredictCache(userA);
  assert.equal(snapshot.results.owner, 'A');
  assert.equal('token' in snapshot, false);
  assert.equal('accessToken' in snapshot, false);
});
