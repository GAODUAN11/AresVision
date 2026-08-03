import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalPointProbe } from './pointProbeModel.js';

test('builds a local point probe from the current slice when the backend has not loaded yet', () => {
  const probe = buildLocalPointProbe({
    requested: { lat: 1.2, lng: 6.1, ls: 15 },
    sliceData: {
      variable: 'o3col',
      points: [
        { lat: 0, lng: 0, val: 10 },
        { lat: 0, lng: 5, val: 14 },
        { lat: 5, lng: 5, val: 20 },
      ],
    },
  });

  assert.equal(probe.status, 'local');
  assert.equal(probe.gridPoint.lat, 0);
  assert.equal(probe.gridPoint.lng, 5);
  assert.equal(probe.current.value, 14);
  assert.equal(probe.comparison.globalMean, 44 / 3);
  assert.equal(probe.comparison.latitudeMean, 12);
});

test('uses circular longitude distance when selecting the nearest point', () => {
  const probe = buildLocalPointProbe({
    requested: { lat: 0, lng: 179 },
    sliceData: {
      points: [
        { lat: 0, lng: -180, val: 4 },
        { lat: 0, lng: 120, val: 8 },
      ],
    },
  });

  assert.equal(probe.gridPoint.lng, -180);
  assert.equal(probe.current.value, 4);
});

