import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pageSource = readFileSync(new URL('../ModelTrainingPage.jsx', import.meta.url), 'utf8');

test('training page renders a structured live log panel', () => {
  assert.match(pageSource, /model-training-log-panel/);
  assert.match(pageSource, /model-training-log-row/);
  assert.match(pageSource, /autoScrollPinned/);
  assert.match(pageSource, /copy\.logLines/);
});

test('live log panel stretches with the status card height', () => {
  assert.match(pageSource, /model-training-status-card/);
  assert.match(pageSource, /model-training-log-section/);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*display:\s*flex/s);
  assert.match(pageSource, /\.model-training-log-section\s*\{[^}]*flex:\s*1/s);
  assert.match(pageSource, /\.model-training-log-panel\s*\{[^}]*flex:\s*1/s);
  assert.match(pageSource, /\.model-training-log-scroll\s*\{[^}]*flex:\s*1/s);
});

test('long live logs scroll inside the panel instead of stretching it', () => {
  assert.match(pageSource, /\.model-training-log-panel\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(pageSource, /\.model-training-log-scroll\s*\{[^}]*min-height:\s*0/s);
  assert.match(pageSource, /\.model-training-log-scroll\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(pageSource, /\.model-training-log-scroll\s*\{[^}]*overscroll-behavior:\s*contain/s);
});

test('training control and status columns share a capped equal height', () => {
  assert.match(pageSource, /\.model-training-grid\s*\{[^}]*align-items:\s*stretch/s);
  assert.match(pageSource, /\.model-training-grid\s*\{[^}]*height:\s*clamp\(620px,\s*calc\(100vh\s*-\s*112px\),\s*720px\)/s);
  assert.match(pageSource, /className="glass-card model-training-controls-card"/);
  assert.match(pageSource, /\.model-training-controls-card\s*\{[^}]*height:\s*100%/s);
  assert.match(pageSource, /\.model-training-controls-card\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*height:\s*100%/s);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(pageSource, /@media \(max-width: 1180px\)[\s\S]*?\.model-training-grid\s*\{[^}]*height:\s*auto/s);
});

test('training status card scrolls when its content exceeds the capped height', () => {
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*overscroll-behavior:\s*contain/s);
  assert.match(pageSource, /@media \(max-width: 1180px\)[\s\S]*?\.model-training-status-card\s*\{[^}]*overflow:\s*visible/s);
});

test('live log panel bottom aligns with the status card bottom', () => {
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*display:\s*flex/s);
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(pageSource, /\.model-training-log-section\s*\{[^}]*flex:\s*1/s);
  assert.match(pageSource, /\.model-training-log-section\s*\{[^}]*min-height:\s*300px/s);
  assert.match(pageSource, /\.model-training-log-panel\s*\{[^}]*flex:\s*1/s);
  assert.match(pageSource, /\.model-training-log-panel\s*\{[^}]*min-height:\s*260px/s);
});

test('live log panel keeps a visible height inside the scrollable status card', () => {
  assert.match(pageSource, /\.model-training-status-card\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(pageSource, /\.model-training-log-section\s*\{[^}]*flex:\s*1\s+0\s+300px/s);
  assert.match(pageSource, /\.model-training-log-panel\s*\{[^}]*min-height:\s*260px/s);
  assert.match(pageSource, /\.model-training-log-scroll\s*\{[^}]*overflow-y:\s*auto/s);
});
