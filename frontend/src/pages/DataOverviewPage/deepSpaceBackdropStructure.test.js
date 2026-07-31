import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../DataOverviewPage.jsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

test('DataOverviewPage renders the dedicated deep space backdrop behind Mars', () => {
  assert.match(pageSource, /import DeepSpaceBackdrop/);
  assert.match(pageSource, /<DeepSpaceBackdrop \/>[\s\S]*<Mars3DBackground/);
});

test('deep space backdrop CSS defines only clean deep-space layers', () => {
  [
    '.overview-deep-space-backdrop',
    '.overview-deep-space-vignette',
  ].forEach((selector) => {
    assert.equal(cssSource.includes(selector), true, `${selector} is missing`);
  });

  [
    '.overview-deep-space-starfield',
    '.overview-deep-space-orbit-trails',
    '.overview-deep-space-planet-halo',
    '.overview-deep-space-dust-lane',
    '.overview-deep-space-film-grain',
  ].forEach((selector) => {
    assert.equal(cssSource.includes(selector), false, `${selector} should be removed`);
  });
});
