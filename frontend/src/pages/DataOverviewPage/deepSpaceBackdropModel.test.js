import test from 'node:test';
import assert from 'node:assert/strict';

import { DEEP_SPACE_BACKDROP_LAYERS } from './deepSpaceBackdropModel.js';

test('data overview deep space backdrop uses realistic astronomical layers', () => {
  assert.deepEqual(
    DEEP_SPACE_BACKDROP_LAYERS.map((layer) => layer.id),
    ['vignette'],
  );
});

test('deep space backdrop layers are decorative and non-interactive', () => {
  assert.equal(DEEP_SPACE_BACKDROP_LAYERS.every((layer) => layer.ariaHidden), true);
  assert.equal(DEEP_SPACE_BACKDROP_LAYERS.every((layer) => layer.pointerEvents === 'none'), true);
});
