import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(currentDir, 'PredictSidebar.jsx'), 'utf8');
const modelSourceSection = source.slice(
  source.indexOf('function ModelSourceControl'),
  source.indexOf('function SelectionPerformance'),
);

test('single trained model selector uses themed custom dropdown instead of native select', () => {
  assert.match(source, /function TrainedModelDropdown/);
  assert.match(modelSourceSection, /<TrainedModelDropdown/);
  assert.doesNotMatch(modelSourceSection, /<select/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /document\.addEventListener\('mousedown'/);
  assert.match(source, /KeyboardArrowDownRoundedIcon/);
  assert.match(source, /CheckRoundedIcon/);
});
