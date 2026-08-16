import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, 'AICopilotWidget.jsx'), 'utf8');

test('Ares Copilot bubble only exposes chart interpretation as its primary action', () => {
  assert.equal(source.includes('调取极端环境耦合分析'), false);
  assert.equal(source.includes('Open Extreme Coupling Analysis'), false);
  assert.equal(source.includes('jumpBtn'), false);
  assert.equal(source.includes('handleAction'), false);
  assert.equal(source.includes('setActiveAnalysisMode'), false);
});
