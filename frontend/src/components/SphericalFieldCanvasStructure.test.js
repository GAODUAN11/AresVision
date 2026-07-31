import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./SphericalFieldCanvas.jsx', import.meta.url), 'utf8');

test('SphericalFieldCanvas exposes screen-coordinate globe picking for gesture dwell selection', () => {
  assert.match(source, /pickGlobeAtClientPoint: \(clientX, clientY\)/);
  assert.match(source, /const coord = pickGlobeAtClientPoint\(event\.clientX, event\.clientY\)/);
  assert.match(source, /onGlobeClickRef\.current\(coord\)/);
});
