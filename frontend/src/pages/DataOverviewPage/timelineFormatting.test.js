import test from 'node:test';
import assert from 'node:assert/strict';

import { formatTimelineLs } from './timelineFormatting.js';

test('formatTimelineLs keeps solar longitude labels readable', () => {
  assert.equal(formatTimelineLs(0.340463131666183), '0.3');
  assert.equal(formatTimelineLs(90), '90');
  assert.equal(formatTimelineLs(120.04), '120');
  assert.equal(formatTimelineLs(120.05), '120.1');
  assert.equal(formatTimelineLs(Number.NaN), '--');
});
