import test from 'node:test';
import assert from 'node:assert/strict';

import { getNotificationVisual, getRelatedTrainingTaskId } from './notificationModel.js';

test('uses a danger presentation for training OOM notifications', () => {
  assert.deepEqual(getNotificationVisual('training_oom'), {
    icon: '!',
    color: '#d95c5c',
    bg: 'rgba(217,92,92,0.12)',
    border: 'rgba(217,92,92,0.30)',
  });
});

test('returns a valid related training task id', () => {
  assert.equal(getRelatedTrainingTaskId({ related_training_task_id: 23 }), 23);
});

test('rejects absent and non-positive related training task ids', () => {
  assert.equal(getRelatedTrainingTaskId({ related_training_task_id: null }), null);
  assert.equal(getRelatedTrainingTaskId({ related_training_task_id: 0 }), null);
});
