import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./SphericalFieldCanvas.jsx', import.meta.url), 'utf8');

test('SphericalFieldCanvas exposes screen-coordinate globe picking for gesture dwell selection', () => {
  assert.match(source, /pickGlobeAtClientPoint: \(clientX, clientY\)/);
  assert.match(source, /const coord = pickGlobeAtClientPoint\(event\.clientX, event\.clientY\)/);
  assert.match(source, /onGlobeClickRef\.current\(coord\)/);
});

test('seasonal sunlight updates do not rebuild static geo annotation overlays', () => {
  const effects = Array.from(source.matchAll(/useEffect\(\(\) => \{[\s\S]*?\}, \[([^\]]*)\]\);/g))
    .map((match) => ({ body: match[0], deps: match[1] }));
  const overlayEffects = effects.filter((effect) => effect.body.includes('buildGeoOverlay'));
  assert.ok(overlayEffects.length > 0, 'expected geo overlay creation to live in effects');
  overlayEffects.forEach((effect) => {
    assert.doesNotMatch(effect.deps, /solarLongitudeLs/);
  });

  const solarLightEffect = effects.find((effect) => (
    effect.body.includes('buildSeasonalSunLight(solarLongitudeLs)')
    && effect.deps.includes('solarLongitudeLs')
  ));
  assert.ok(solarLightEffect, 'expected a dedicated solar light effect');
  assert.doesNotMatch(solarLightEffect.body, /buildGeoOverlay/);
});
