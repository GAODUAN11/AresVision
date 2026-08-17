import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const timelineControllerSource = readFileSync(new URL('./TimelineController.jsx', import.meta.url), 'utf8');
const globalCssSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

test('timeline controller uses a compact two-line layout instead of a separate source legend row', () => {
  assert.match(timelineControllerSource, /timeline-meta-strip/);
  assert.match(timelineControllerSource, /timeline-source-dot/);
  assert.doesNotMatch(timelineControllerSource, /SOURCE_LEGEND\.map/);
  assert.doesNotMatch(timelineControllerSource, /marginTop:\s*2,\s*flexWrap:\s*'wrap'/);
});

test('timeline range input keeps a slim hit area and thumb', () => {
  assert.match(globalCssSource, /height:\s*16px/);
  assert.match(globalCssSource, /width:\s*12px/);
  assert.match(globalCssSource, /height:\s*12px/);
  assert.doesNotMatch(globalCssSource, /height:\s*30px/);
});
