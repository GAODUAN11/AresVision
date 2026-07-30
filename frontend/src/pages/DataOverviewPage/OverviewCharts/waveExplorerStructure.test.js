import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./WaveExplorer.jsx', import.meta.url), 'utf8');

test('WaveExplorer keeps diagnostics visible when the heatmap is loading or empty', () => {
  assert.equal(source.includes('if (loading) {'), false);
  assert.equal(source.includes('if (!data || !data.x) {'), false);
  assert.match(source, /<WaveBandDiagnosticsChart[\s\S]*baseData=\{data\}/);
  assert.match(source, /<WaveBandDiagnosticsChart[\s\S]*baseLoading=\{loading\}/);
});
