import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRAINING_HORIZON_MAX,
  clampPredictionHorizon,
  getTaskPredictionHorizon,
  resolvePredictionHorizonLimit,
} from './predictionHorizon.js';
import {
  PREDICT_MODEL_MODE_COMPARE,
  PREDICT_MODEL_MODE_TRAINED,
} from './predictModelModes.js';

test('reads trained horizons from object and JSON hyperparameters', () => {
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: 30 } }), 30);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: JSON.stringify({ horizon: 10 }) }), 10);
});

test('rejects missing, malformed, and out-of-range trained horizons', () => {
  assert.equal(getTaskPredictionHorizon({ hyperparameters: '{}' }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: 'not json' }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: 0 } }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: 31 } }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: 2.5 } }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: true } }), null);
  assert.equal(getTaskPredictionHorizon({ hyperparameters: { horizon: '10' } }), null);
});

test('uses the selected trained model horizon as the single-model limit', () => {
  assert.equal(resolvePredictionHorizonLimit({
    modelMode: PREDICT_MODEL_MODE_TRAINED,
    selectedTask: { hyperparameters: { horizon: 12 } },
  }), 12);
});

test('uses the smallest trained horizon as the comparison limit', () => {
  assert.equal(resolvePredictionHorizonLimit({
    modelMode: PREDICT_MODEL_MODE_COMPARE,
    selectedTasks: [
      { hyperparameters: { horizon: 10 } },
      { hyperparameters: JSON.stringify({ horizon: 6 }) },
      { hyperparameters: { horizon: 18 } },
    ],
  }), 6);
});

test('requires at least two valid models for a comparison limit', () => {
  assert.equal(resolvePredictionHorizonLimit({
    modelMode: PREDICT_MODEL_MODE_COMPARE,
    selectedTasks: [{ hyperparameters: { horizon: 6 } }],
  }), null);
  assert.equal(resolvePredictionHorizonLimit({
    modelMode: PREDICT_MODEL_MODE_COMPARE,
    selectedTasks: [
      { hyperparameters: { horizon: 6 } },
      { hyperparameters: { horizon: 0 } },
    ],
  }), null);
});

test('clamps prediction horizons into the active trained-model range', () => {
  assert.equal(TRAINING_HORIZON_MAX, 30);
  assert.equal(clampPredictionHorizon(9, 6), 6);
  assert.equal(clampPredictionHorizon(0, 6), 1);
  assert.equal(clampPredictionHorizon(4.6, 6), 5);
  assert.equal(clampPredictionHorizon('invalid', 6), 1);
  assert.equal(clampPredictionHorizon(4, null), null);
});
