import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginAuthenticatedPredictionSession,
  endAuthenticatedPredictionSession,
  getActiveAuthenticatedPredictScope,
} from './authPredictionSession.js';
import {
  clearPredictCache,
  createUserPredictScope,
  getPredictCache,
  setPredictCache,
} from './predictCache.js';

const userA = createUserPredictScope(101);
const userB = createUserPredictScope(202);

test.beforeEach(() => {
  endAuthenticatedPredictionSession();
  clearPredictCache(userA);
  clearPredictCache(userB);
});

test('ending an authenticated session clears the outgoing user prediction cache', () => {
  beginAuthenticatedPredictionSession(101);
  setPredictCache(userA, {
    results: { owner: 'A' },
    metrics: { rmse: 1 },
    selectedCompareTrainingTaskIds: [42, 43],
  });

  endAuthenticatedPredictionSession();

  assert.equal(getActiveAuthenticatedPredictScope(), null);
  assert.equal(getPredictCache(userA).results, null);
  assert.equal(getPredictCache(userA).metrics, null);
  assert.deepEqual(getPredictCache(userA).selectedCompareTrainingTaskIds, []);
});

test('changing authenticated user ID synchronously clears the previous user cache', () => {
  beginAuthenticatedPredictionSession(101);
  setPredictCache(userA, {
    resultContextKey: 'user-a-context',
    results: { owner: 'A' },
    metrics: { rmse: 1 },
    errorDistData: { owner: 'A' },
    pfiData: { owner: 'A' },
    performanceData: { owner: 'A' },
    performanceKey: 'user-a-performance',
    params: { trainingTaskId: 42 },
    compareConfigs: [{ id: 'config-a' }],
    selectedCompareIds: ['config-a'],
    selectedCompareTrainingTaskIds: [42, 43],
    compareTrainingMetricsData: { owner: 'A' },
    compareTrainingErrorData: { owner: 'A' },
    compareTrainingPfiData: { owner: 'A' },
    error: 'private error',
    loading: true,
    metricsLoading: true,
    errorDistLoading: true,
    pfiLoading: true,
    perfLoading: true,
    compareTrainingLoading: true,
    compareTrainingErrorLoading: true,
    compareTrainingPfiLoading: true,
  });
  setPredictCache(userB, { results: { owner: 'B-existing' } });

  const nextScope = beginAuthenticatedPredictionSession(202);

  assert.equal(nextScope, userB);
  assert.equal(getActiveAuthenticatedPredictScope(), userB);
  const cleared = getPredictCache(userA);
  assert.equal(cleared.resultContextKey, null);
  assert.equal(cleared.results, null);
  assert.equal(cleared.metrics, null);
  assert.equal(cleared.errorDistData, null);
  assert.equal(cleared.pfiData, null);
  assert.equal(cleared.performanceData, null);
  assert.equal(cleared.performanceKey, null);
  assert.equal(cleared.params, null);
  assert.deepEqual(cleared.compareConfigs, []);
  assert.deepEqual(cleared.selectedCompareIds, []);
  assert.deepEqual(cleared.selectedCompareTrainingTaskIds, []);
  assert.equal(cleared.compareTrainingMetricsData, null);
  assert.equal(cleared.compareTrainingErrorData, null);
  assert.equal(cleared.compareTrainingPfiData, null);
  assert.equal(cleared.error, null);
  assert.equal(cleared.loading, false);
  assert.equal(cleared.metricsLoading, false);
  assert.equal(cleared.errorDistLoading, false);
  assert.equal(cleared.pfiLoading, false);
  assert.equal(cleared.perfLoading, false);
  assert.equal(cleared.compareTrainingLoading, false);
  assert.equal(cleared.compareTrainingErrorLoading, false);
  assert.equal(cleared.compareTrainingPfiLoading, false);
  assert.deepEqual(getPredictCache(userB).results, { owner: 'B-existing' });
});

test('invalid user identities cannot become an authenticated prediction scope', () => {
  assert.equal(beginAuthenticatedPredictionSession(null), null);
  assert.equal(getActiveAuthenticatedPredictScope(), null);
});
