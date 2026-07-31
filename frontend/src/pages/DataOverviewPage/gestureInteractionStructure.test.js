import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../DataOverviewPage.jsx', import.meta.url), 'utf8');

test('DataOverviewPage connects advanced hand gestures to timeline and point probing', () => {
  assert.match(source, /gesture\.type === 'toggleTimeline'/);
  assert.match(source, /gesture\.type === 'pointHover'/);
  assert.match(source, /gesture\.type === 'selectPoint'/);
  assert.match(source, /pickGlobeAtClientPoint/);
  assert.match(source, /gesturePointer/);
});

test('fist closes the point probe before toggling timeline playback', () => {
  const toggleBlockStart = source.indexOf("if (gesture.type === 'toggleTimeline')");
  const toggleBlockEnd = source.indexOf("if (gesture.type === 'pointHover')");
  const toggleBlock = source.slice(toggleBlockStart, toggleBlockEnd);

  assert.match(toggleBlock, /if \(pointProbe\)/);
  assert.match(toggleBlock, /handleClosePointProbe/);
  assert.match(toggleBlock, /setIsPlayingTimeline/);
});
