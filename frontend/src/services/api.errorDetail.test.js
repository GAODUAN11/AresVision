import test from 'node:test';
import assert from 'node:assert/strict';

import { compareTrainingModels, runPrediction } from './api.js';


function installFastApiError(detail) {
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
  globalThis.window = { dispatchEvent: () => {} };
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({ detail }),
  });
}


test('prediction surfaces FastAPI detail when a listed model file disappears', async () => {
  installFastApiError('Model file not found');

  await assert.rejects(
    runPrediction({ training_task_id: 31 }),
    new Error('Model file not found')
  );
});


test('training model comparison surfaces FastAPI detail', async () => {
  installFastApiError('Model file not found');

  await assert.rejects(
    compareTrainingModels([31, 32]),
    new Error('Model file not found')
  );
});
