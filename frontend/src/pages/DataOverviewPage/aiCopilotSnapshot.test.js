import test from 'node:test';
import assert from 'node:assert/strict';

import { buildExpandedCardSnapshot } from './aiCopilotSnapshot.js';

test('non-wave cards use their own AI snapshot', () => {
  const snapshot = buildExpandedCardSnapshot((cardKey) => ({ card: cardKey, status: 'ready' }), 'seasonal');

  assert.deepEqual(snapshot, { card: 'seasonal', status: 'ready' });
});

test('wave card includes the internal diagnostics snapshot', () => {
  const snapshots = {
    wave: { card: 'wave', valueRange: { min: -2, max: 3 } },
    waveDiag: { card: 'waveDiag', rmsByBand: [{ band: 'north', rms: 1.4 }] },
  };

  const snapshot = buildExpandedCardSnapshot((cardKey) => snapshots[cardKey], 'wave');

  assert.deepEqual(snapshot, {
    card: 'wave',
    valueRange: { min: -2, max: 3 },
    diagnostics: snapshots.waveDiag,
  });
});
