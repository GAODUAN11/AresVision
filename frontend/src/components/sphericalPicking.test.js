import test from 'node:test';
import assert from 'node:assert/strict';

import { localPointToLatLng } from './sphericalPicking.js';

test('converts local sphere cardinal points to the same latitude and longitude convention as the renderer', () => {
  assert.deepEqual(localPointToLatLng({ x: 1, y: 0, z: 0 }), { lat: 0, lng: 0 });
  assert.deepEqual(localPointToLatLng({ x: 0, y: 1, z: 0 }), { lat: 90, lng: 0 });
  assert.deepEqual(localPointToLatLng({ x: 0, y: -1, z: 0 }), { lat: -90, lng: 0 });
  assert.deepEqual(localPointToLatLng({ x: 0, y: 0, z: 1 }), { lat: 0, lng: 90 });
});

test('normalizes longitude to the -180 to 180 degree range', () => {
  const point = localPointToLatLng({ x: -1, y: 0, z: -0.000001 });

  assert.equal(point.lat, 0);
  assert.equal(point.lng, -180);
});

