import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePredictCacheTrainingTasks } from './predictCacheTaskValidation.js';

function makeSnapshot(overrides = {}) {
  return {
    scope: 'user:101',
    params: {
      modelMode: 'trained',
      trainingTaskId: 42,
      compareTrainingTaskIds: [42, 43],
    },
    resultContextKey: 'task:42-context',
    results: { taskId: 42 },
    metrics: { rmse: 1 },
    errorDistData: { taskId: 42 },
    pfiData: { taskId: 42 },
    performanceData: { taskId: 42 },
    performanceKey: 'performance:42',
    metricsKey: 'metrics:42',
    errorDistKey: 'errors:42',
    pfiKey: 'pfi:42',
    selectedCompareTrainingTaskIds: [42, 43],
    compareTrainingMetricsData: { taskIds: [42, 43] },
    compareTrainingMetricsKey: 'compare-metrics:42,43',
    compareTrainingErrorData: { taskIds: [42, 43] },
    compareTrainingErrorKey: 'compare-errors:42,43',
    compareTrainingPfiData: { taskIds: [42, 43] },
    compareTrainingPfiKey: 'compare-pfi:42,43',
    ...overrides,
  };
}

test('inaccessible selected training task discards all related single-model state', () => {
  const validated = validatePredictCacheTrainingTasks(makeSnapshot(), [43]);

  assert.equal(validated.params.trainingTaskId, null);
  assert.equal(validated.resultContextKey, null);
  assert.equal(validated.results, null);
  assert.equal(validated.metrics, null);
  assert.equal(validated.errorDistData, null);
  assert.equal(validated.pfiData, null);
  assert.equal(validated.performanceData, null);
  assert.equal(validated.performanceKey, null);
  assert.equal(validated.metricsKey, null);
  assert.equal(validated.errorDistKey, null);
  assert.equal(validated.pfiKey, null);
});

test('inaccessible comparison task filters selection and discards the complete comparison bundle', () => {
  const validated = validatePredictCacheTrainingTasks(makeSnapshot(), [42]);

  assert.deepEqual(validated.selectedCompareTrainingTaskIds, [42]);
  assert.deepEqual(validated.params.compareTrainingTaskIds, [42]);
  assert.equal(validated.compareTrainingMetricsData, null);
  assert.equal(validated.compareTrainingMetricsKey, null);
  assert.equal(validated.compareTrainingErrorData, null);
  assert.equal(validated.compareTrainingErrorKey, null);
  assert.equal(validated.compareTrainingPfiData, null);
  assert.equal(validated.compareTrainingPfiKey, null);
});

test('valid accessible training tasks preserve cached result bundles', () => {
  const snapshot = makeSnapshot();
  const validated = validatePredictCacheTrainingTasks(snapshot, [43, 42]);

  assert.deepEqual(validated, snapshot);
  assert.notEqual(validated, snapshot);
});

test('anonymous scope cannot restore authenticated training-task state', () => {
  const validated = validatePredictCacheTrainingTasks(
    makeSnapshot({ scope: 'anonymous' }),
    [42, 43]
  );

  assert.equal(validated.params.trainingTaskId, null);
  assert.deepEqual(validated.selectedCompareTrainingTaskIds, []);
  assert.equal(validated.results, null);
  assert.equal(validated.compareTrainingMetricsData, null);
  assert.equal(validated.compareTrainingErrorData, null);
  assert.equal(validated.compareTrainingPfiData, null);
});

test('anonymous non-training prediction state remains available in the anonymous scope', () => {
  const snapshot = makeSnapshot({
    scope: 'anonymous',
    params: {
      modelMode: 'system',
      trainingTaskId: null,
      compareTrainingTaskIds: [],
    },
    selectedCompareTrainingTaskIds: [],
    results: { owner: 'anonymous' },
    resultContextKey: 'anonymous-system-context',
    metrics: { rmse: 2 },
  });

  const validated = validatePredictCacheTrainingTasks(snapshot, []);

  assert.deepEqual(validated.results, { owner: 'anonymous' });
  assert.equal(validated.resultContextKey, 'anonymous-system-context');
  assert.deepEqual(validated.metrics, { rmse: 2 });
});
