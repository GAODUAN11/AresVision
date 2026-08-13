import test from 'node:test';
import assert from 'node:assert/strict';

import { formatAdaptiveValue, formatAdaptiveSeries } from './chartValueFormat.js';

test('formatAdaptiveValue keeps tiny non-zero ozone values visible', () => {
  assert.equal(formatAdaptiveValue(2.126089748344384e-5, { fixedDigits: 3 }), '2.13e-5');
  assert.equal(formatAdaptiveValue(-7.867813110351562e-6, { fixedDigits: 3 }), '-7.87e-6');
});

test('formatAdaptiveValue preserves fixed precision for normal chart values', () => {
  assert.equal(formatAdaptiveValue(17.58602523803711, { fixedDigits: 3 }), '17.586');
  assert.equal(formatAdaptiveValue(0.07538986951112747, { fixedDigits: 3 }), '0.075');
  assert.equal(formatAdaptiveValue(0, { fixedDigits: 3 }), '0');
});

test('formatAdaptiveSeries formats arrays for Plotly customdata', () => {
  assert.deepEqual(
    formatAdaptiveSeries([2.126089748344384e-5, 17.58602523803711, Number.NaN], { fixedDigits: 3 }),
    [['2.13e-5'], ['17.586'], ['--']],
  );
});
