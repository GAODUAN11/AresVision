import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pageSource = readFileSync(new URL('../ModelTrainingPage.jsx', import.meta.url), 'utf8');
const uploadedPanelSource = readFileSync(new URL('./UploadedModelPanel.jsx', import.meta.url), 'utf8');
const dynamicParamsSource = readFileSync(new URL('./DynamicModelParamsForm.jsx', import.meta.url), 'utf8');

function nearby(source, marker, length = 700) {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `Expected marker: ${marker}`);
  return source.slice(index, index + length);
}

test('locks every structure-defining control for a synchronized task source', () => {
  assert.match(pageSource, /const transferStructureLocked\s*=/);
  assert.match(nearby(pageSource, '<ModelSourceSelector'), /disabled=\{!user \|\| transferStructureLocked\}/);
  assert.match(nearby(pageSource, '<UploadedModelPanel'), /selectionDisabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, '<UploadedModelPanel'), /busy=\{isProcessing \|\| transferStructureLocked\}/);
  assert.match(nearby(pageSource, '<DynamicModelParamsForm'), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, 'key={channel}', 900), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, 'key={architecture.id}', 900), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, 'onClick={() => setUseSphere', 700), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, "{t('modelTraining.window')}", 650), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, "{t('modelTraining.horizon')}", 650), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, 'value={stlstmLayers}', 350), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, 'value={dim}', 450), /disabled=\{transferStructureLocked\}/);
  assert.match(nearby(pageSource, "type={field.type === 'integerList' ? 'text' : 'number'}", 950), /disabled=\{transferStructureLocked\}/);

  assert.match(uploadedPanelSource, /selectionDisabled = false/);
  assert.match(uploadedPanelSource, /disabled=\{selectionDisabled\}/);
  assert.match(dynamicParamsSource, /disabled = false/);
  assert.match(dynamicParamsSource, /disabled=\{disabled\}/);
});

test('keeps fine-tuning controls editable while source structure is locked', () => {
  assert.doesNotMatch(nearby(pageSource, "{t('modelTraining.epochs')}", 600), /transferStructureLocked/);
  assert.doesNotMatch(nearby(pageSource, "{t('modelTraining.batchSize')}", 600), /transferStructureLocked/);
  assert.doesNotMatch(nearby(pageSource, "{t('modelTraining.learningRate')}", 600), /transferStructureLocked/);
  assert.doesNotMatch(nearby(pageSource, '{copy.freezeMode}', 650), /transferStructureLocked/);
  assert.doesNotMatch(nearby(pageSource, '{copy.finetuneLearningRate}', 750), /transferStructureLocked/);
  assert.doesNotMatch(nearby(pageSource, '{copy.randomSeed}', 650), /transferStructureLocked/);
});
