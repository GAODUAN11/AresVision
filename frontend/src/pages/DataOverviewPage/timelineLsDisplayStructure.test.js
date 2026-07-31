import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const timelineControllerSource = readFileSync(new URL('./TimelineController.jsx', import.meta.url), 'utf8');
const topStatusBarSource = readFileSync(new URL('./TopStatusBar.jsx', import.meta.url), 'utf8');

test('overview Ls labels use the compact timeline formatter', () => {
  assert.match(timelineControllerSource, /formatTimelineLs/);
  assert.match(topStatusBarSource, /formatTimelineLs/);
  assert.doesNotMatch(timelineControllerSource, /\{globalTimeLs\}掳|\{globalTimeLs\}°/);
  assert.doesNotMatch(topStatusBarSource, /\{globalTimeLs\}掳|\{globalTimeLs\}°/);
});
