import test from 'node:test';
import assert from 'node:assert/strict';

import { movingAverageSeries } from './chartSeries.js';

test('movingAverageSeries smooths finite values without changing length', () => {
  const result = movingAverageSeries([1, 3, 5, 7, 9], 3);

  assert.deepEqual(result, [2, 3, 5, 7, 8]);
});

test('movingAverageSeries ignores missing values inside the window', () => {
  const result = movingAverageSeries([1, null, 5, Number.NaN, 9], 3);

  assert.deepEqual(result, [1, 3, 5, 7, 9]);
});
