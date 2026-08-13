import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../DataOverviewPage.jsx', import.meta.url), 'utf8');

test('data overview advances the timeline on the original fixed 600ms interval', () => {
  assert.match(pageSource, /setInterval/);
  assert.match(pageSource, /\},\s*600\);/);
  assert.doesNotMatch(pageSource, /getTimelineAdvanceDelay/);
  assert.doesNotMatch(pageSource, /loadingOzoneOverlay/);
});
