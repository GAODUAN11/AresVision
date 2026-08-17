import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOverviewSourceSnapshot,
  formatInsightValue,
  sampleInsightSeries,
  summarizeInsightSeries,
} from './aiInsight.js';

test('formatInsightValue keeps tiny non-zero values visible for AI snapshots', () => {
  assert.equal(formatInsightValue(2.126089748344384e-5), '2.13e-5');
  assert.equal(formatInsightValue(-7.867813110351562e-6), '-7.87e-6');
});

test('formatInsightValue keeps ordinary values compact and numeric', () => {
  assert.equal(formatInsightValue(17.58602523803711), 17.586);
  assert.equal(formatInsightValue(0.07538986951112747), 0.0754);
  assert.equal(formatInsightValue(0), 0);
  assert.equal(formatInsightValue(Number.NaN), null);
});

test('summarizeInsightSeries preserves tiny min max and mean values', () => {
  assert.deepEqual(summarizeInsightSeries([2e-5, 4e-5, Number.NaN]), {
    count: 2,
    min: '2.00e-5',
    max: '4.00e-5',
    mean: '3.00e-5',
  });
});

test('sampleInsightSeries preserves labels and tiny values', () => {
  assert.deepEqual(sampleInsightSeries([2e-5, 1, 4e-5], [0, 180, 360], 2), [
    { index: 0, x: 0, y: '2.00e-5' },
    { index: 2, x: 360, y: '4.00e-5' },
  ]);
});

test('buildOverviewSourceSnapshot distinguishes official and personal MCD sources', () => {
  assert.deepEqual(buildOverviewSourceSnapshot(), { type: 'official_mcd' });
  assert.deepEqual(buildOverviewSourceSnapshot({ mcdUploadId: 42 }), {
    type: 'personal_mcd_upload',
    mcdUploadId: 42,
  });
});
