import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./CompareTrainingModelsPanel.jsx', import.meta.url), 'utf8');

test('metric comparison bar chart keeps model names on a categorical y axis', () => {
  const metricBarsSource = source
    .split('function MetricBars(', 2)[1]
    .split('function ParameterMatrix(', 1)[0];

  assert.match(metricBarsSource, /orientation:\s*'h'/);
  assert.match(metricBarsSource, /y:\s*sorted\.map\(\(item\) => item\.model_name \|\| `Task #\$\{item\.task_id\}`\)/);
  assert.match(metricBarsSource, /yaxis:\s*\{[^}]*type:\s*'category'/s);
});
