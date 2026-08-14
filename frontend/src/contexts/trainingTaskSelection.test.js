import test from 'node:test';
import assert from 'node:assert/strict';

import { reconcileActiveTrainingTaskId } from './trainingTaskSelection.js';


const tasks = [
  { id: 11, status: 'completed' },
  { id: 12, status: 'running' },
];

test('keeps a preferred task when it remains accessible', () => {
  assert.equal(reconcileActiveTrainingTaskId(tasks, 11), 11);
});

test('falls back to a running task when the preferred task was deleted', () => {
  assert.equal(reconcileActiveTrainingTaskId(tasks, 99), 12);
});

test('clears an inaccessible task when no task is running', () => {
  assert.equal(
    reconcileActiveTrainingTaskId([{ id: 11, status: 'failed' }], 99),
    null
  );
});
