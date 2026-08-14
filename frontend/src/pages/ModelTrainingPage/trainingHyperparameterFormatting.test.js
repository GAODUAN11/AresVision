import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatBooleanHyperparameterValue } from './trainingHyperparameterFormatting.js';

const translate = (key) => ({
  'modelTraining.hypers.booleanEnabled': '开启',
  'modelTraining.hypers.booleanDisabled': '关闭',
}[key] || key);

test('formats boolean training hyperparameters as localized text', () => {
  assert.equal(formatBooleanHyperparameterValue(true, translate), '开启');
  assert.equal(formatBooleanHyperparameterValue(false, translate), '关闭');
});
