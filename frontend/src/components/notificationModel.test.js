import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNotificationVisual,
  getRelatedTrainingTaskId,
  parseNotificationTimestamp,
} from './notificationModel.js';

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

test('parses notification timestamps with or without an explicit timezone', () => {
  const expected = Date.parse('2026-08-14T10:00:00Z');

  assert.equal(parseNotificationTimestamp('2026-08-14T10:00:00'), expected);
  assert.equal(parseNotificationTimestamp('2026-08-14T10:00:00+00:00'), expected);
});

test('returns NaN for an invalid notification timestamp', () => {
  assert.equal(Number.isNaN(parseNotificationTimestamp(null)), true);
});
