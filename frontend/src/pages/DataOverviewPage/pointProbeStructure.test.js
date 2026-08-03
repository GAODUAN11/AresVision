import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../DataOverviewPage.jsx', import.meta.url), 'utf8');
const modalSource = readFileSync(new URL('./PointProbeModal.jsx', import.meta.url), 'utf8');

test('Data Overview opens a dedicated point probe modal instead of setting right-panel selectedCoordinate', () => {
  assert.match(pageSource, /PointProbeModal/);
  assert.match(pageSource, /fetchOverviewPointProbe/);
  assert.doesNotMatch(pageSource, /onGlobeClick=\{\(coord\) => setSelectedCoordinate\(coord\)\}/);
});

test('point probe modal renders point, global mean, and latitude mean series', () => {
  assert.match(modalSource, /point/);
  assert.match(modalSource, /globalMean/);
  assert.match(modalSource, /latitudeMean/);
  assert.match(modalSource, /react-plotly\.js/);
});

