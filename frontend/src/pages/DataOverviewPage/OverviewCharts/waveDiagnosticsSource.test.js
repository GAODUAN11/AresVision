import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveWaveDiagnosticsSource } from './waveDiagnosticsSource.js';

test('wave diagnostics reuse parent o3col anomaly data instead of fetching it again', () => {
  const baseData = { x: [0], y: [0], z: [[1]] };

  const source = resolveWaveDiagnosticsSource({
    variable: 'o3col',
    baseVariable: 'o3col',
    baseData,
    baseLoading: false,
  });

  assert.deepEqual(source, {
    shouldFetch: false,
    loading: false,
    data: baseData,
  });
});

test('wave diagnostics wait for parent o3col load rather than duplicate the request', () => {
  const source = resolveWaveDiagnosticsSource({
    variable: 'o3col',
    baseVariable: 'o3col',
    baseData: null,
    baseLoading: true,
  });

  assert.deepEqual(source, {
    shouldFetch: false,
    loading: true,
    data: null,
  });
});

test('wave diagnostics still fetch separately for non-parent variables', () => {
  const source = resolveWaveDiagnosticsSource({
    variable: 'Temperature',
    baseVariable: 'o3col',
    baseData: { x: [0], y: [0], z: [[1]] },
    baseLoading: false,
  });

  assert.deepEqual(source, {
    shouldFetch: true,
    loading: true,
    data: null,
  });
});
