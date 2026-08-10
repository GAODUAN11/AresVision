import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('../ModelTrainingPage.jsx', import.meta.url), 'utf8');
const summaryCardMarker = "<div style={{ ...summaryCardStyle, padding: '16px 16px 14px' }}>";

function sourceBetween(startMarker, endMarker) {
  const start = pageSource.indexOf(startMarker);
  const end = pageSource.indexOf(endMarker, start);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return pageSource.slice(start, end);
}

function trainingDatasetCardSource() {
  const datasetLabel = pageSource.indexOf('{copy.trainingDataset}');
  const start = pageSource.lastIndexOf(summaryCardMarker, datasetLabel);
  const end = pageSource.indexOf(summaryCardMarker, datasetLabel);
  assert.notEqual(datasetLabel, -1, 'training dataset label should exist');
  assert.notEqual(start, -1, 'training dataset card should have a start marker');
  assert.notEqual(end, -1, 'training dataset card should have an end marker');
  return pageSource.slice(start, end);
}

test('model training parameters do not render the redundant server data source panel', () => {
  const cardSource = trainingDatasetCardSource();

  ['{copy.dataSource}', '{copy.sourceDefault}', '{copy.sourceHintDefault}'].forEach((token) => {
    assert.equal(cardSource.includes(token), false, `${token} should not be rendered in the dataset card`);
  });
  assert.match(cardSource, /\{copy\.trainingDataset\}/);
  assert.match(cardSource, /TRAINING_DATASET_OPENMARS_MCD/);
  assert.match(cardSource, /TRAINING_DATASET_MCD_OVERVIEW/);
});

test('training summary keeps the server-managed data source metric', () => {
  const summarySource = sourceBetween(
    '<div className="model-training-summary-grid">',
    '<TrainingProgressMonitor'
  );

  assert.match(summarySource, /label=\{copy\.sourceMode\}[\s\S]*value=\{copy\.sourceDefault\}/);
});
