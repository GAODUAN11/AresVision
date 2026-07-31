import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSeasonalSunLight, normalizeSolarLongitude } from './sphericalLighting.js';

const vectorLength = ({ x, y, z }) => Math.sqrt(x * x + y * y + z * z);
const rounded = ({ x, y, z }) => [x, y, z].map((value) => Number(value.toFixed(4)));

test('normalizeSolarLongitude wraps Ls into one Mars orbital cycle', () => {
  assert.equal(normalizeSolarLongitude(365), 5);
  assert.equal(normalizeSolarLongitude(-5), 355);
  assert.equal(normalizeSolarLongitude(Number.NaN), 0);
});

test('buildSeasonalSunLight keeps the main screen-space light direction stable through the Mars year', () => {
  const ls0 = buildSeasonalSunLight(0);
  const ls90 = buildSeasonalSunLight(90);
  const ls180 = buildSeasonalSunLight(180);
  const ls270 = buildSeasonalSunLight(270);

  for (const light of [ls0, ls90, ls180, ls270]) {
    assert.ok(light.direction.x < 0);
    assert.ok(light.direction.z > 0);
  }

  const horizontalAzimuth = ({ x, z }) => Number(Math.atan2(z, x).toFixed(4));
  assert.equal(horizontalAzimuth(ls0.direction), horizontalAzimuth(ls90.direction));
  assert.equal(horizontalAzimuth(ls0.direction), horizontalAzimuth(ls180.direction));
  assert.equal(horizontalAzimuth(ls0.direction), horizontalAzimuth(ls270.direction));
  assert.ok(Math.abs(vectorLength(ls0.direction) - 1) < 0.0001);
  assert.ok(Math.abs(vectorLength(ls90.direction) - 1) < 0.0001);
});

test('buildSeasonalSunLight tilts northward near Ls 90 and southward near Ls 270', () => {
  const equinox = buildSeasonalSunLight(0).direction;
  const northernSummer = buildSeasonalSunLight(90).direction;
  const northernWinter = buildSeasonalSunLight(270).direction;

  assert.ok(northernSummer.y > equinox.y);
  assert.ok(northernWinter.y < equinox.y);
});
