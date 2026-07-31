import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./SphericalFieldCanvas.jsx', import.meta.url), 'utf8');

test('SphericalFieldCanvas wires pointer picking to onGlobeClick', () => {
  assert.match(source, /onGlobeClick/);
  assert.match(source, /new THREE\.Raycaster\(/);
  assert.match(source, /localPointToLatLng/);
  assert.match(source, /addEventListener\('pointerup'/);
});

