import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../DataOverviewPage.jsx', import.meta.url), 'utf8');
const marsBackgroundSource = readFileSync(new URL('./Mars3DBackground.jsx', import.meta.url), 'utf8');
const sphericalCanvasSource = readFileSync(new URL('../../components/SphericalFieldCanvas.jsx', import.meta.url), 'utf8');

test('overview passes current solar longitude into the 3D Mars renderer', () => {
  assert.match(pageSource, /solarLongitudeLs=\{globalTimeLs\}/);
  assert.match(marsBackgroundSource, /solarLongitudeLs/);
  assert.match(marsBackgroundSource, /<SphericalFieldCanvas[\s\S]*solarLongitudeLs=\{solarLongitudeLs\}/);
});

test('SphericalFieldCanvas updates sunlight from seasonal Ls instead of a fixed direction', () => {
  assert.match(sphericalCanvasSource, /buildSeasonalSunLight/);
  assert.match(sphericalCanvasSource, /solarLongitudeLs/);
  assert.doesNotMatch(sphericalCanvasSource, /dirLight\.position\.set\(5,\s*3,\s*5\)/);
});
