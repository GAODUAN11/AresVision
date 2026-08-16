import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync(new URL('./PointProbeModal.jsx', import.meta.url), 'utf8');

test('point probe modal uses a compact dialog shell instead of a wide analysis board', () => {
  assert.match(modalSource, /point-probe-modal-compact/);
  assert.match(modalSource, /width:\s*'min\(700px, calc\(100vw - 28px\)\)'/);
  assert.match(modalSource, /maxHeight:\s*'min\(600px, calc\(100vh - 28px\)\)'/);
  assert.match(modalSource, /point-probe-header/);
  assert.match(modalSource, /point-probe-summary-grid/);
  assert.match(modalSource, /point-probe-info-panel/);
  assert.match(modalSource, /point-probe-metric-row/);
  assert.match(modalSource, /overview:/);
  assert.match(modalSource, /comparison:/);
  assert.match(modalSource, /point-probe-chart-panel/);
  assert.match(modalSource, /height:\s*220/);
  assert.doesNotMatch(modalSource, /width:\s*'min\(920px, calc\(100vw - 44px\)\)'/);
  assert.doesNotMatch(modalSource, /height:\s*330/);
});
