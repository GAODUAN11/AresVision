import test from 'node:test';
import assert from 'node:assert/strict';

import { getRawDatasetUsage } from './rawDatasetUsage.js';

test('MCD uploads are full Data Overview page sources', () => {
  const usage = getRawDatasetUsage({ data_type: 'mcd', status: 'valid' }, true);

  assert.equal(usage.key, 'overview_mcd');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['数据总览']);
  assert.match(usage.desc, /校验并标准化/);
  assert.match(usage.desc, /右侧图表/);
});

test('OpenMARS uploads are 3D ozone layer sources only', () => {
  const usage = getRawDatasetUsage({ data_type: 'openmars', status: 'valid' }, false);

  assert.equal(usage.key, 'ozone_openmars');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['Data Overview 3D ozone']);
  assert.match(usage.desc, /validated ozone layer/i);
});

test('NOMAD uploads are 3D ozone layer sources only', () => {
  const usage = getRawDatasetUsage({ data_type: 'nomad', status: 'approved' }, false);

  assert.equal(usage.key, 'ozone_nomad');
  assert.equal(usage.usable, true);
  assert.deepEqual(usage.pages, ['Data Overview 3D ozone']);
  assert.match(usage.desc, /observation counts/i);
});

test('invalid and rejected uploads are not usable', () => {
  assert.equal(getRawDatasetUsage({ data_type: 'mcd', status: 'invalid' }, false).usable, false);
  assert.equal(getRawDatasetUsage({ data_type: 'nomad', status: 'rejected' }, false).usable, false);
});
