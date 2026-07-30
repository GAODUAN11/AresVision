import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTrainingRequestDataSource,
  getTrainingSourceLabel,
} from './trainingDataSource.js';

test('training requests always use the server-managed default data source', () => {
  assert.equal(getTrainingRequestDataSource(), 'default');
  assert.equal(getTrainingRequestDataSource('default'), 'default');
  assert.equal(getTrainingRequestDataSource('personal'), 'default');
  assert.equal(getTrainingRequestDataSource('personal_mcd_plus_system_openmars'), 'default');
});

test('training data source labels do not expose legacy personal sources', () => {
  assert.equal(getTrainingSourceLabel('default', { isZh: false }), 'Server-managed data');
  assert.equal(getTrainingSourceLabel('personal', { isZh: false }), 'Server-managed data');
  assert.equal(getTrainingSourceLabel('default', { isZh: true }), '服务器托管数据');
  assert.equal(getTrainingSourceLabel('personal', { isZh: true }), '服务器托管数据');
});
