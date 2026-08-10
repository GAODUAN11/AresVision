# Remove Model Training Data Source Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant server-managed data source panel from the model training parameter card while preserving dataset selection, training summaries, and request behavior.

**Architecture:** Keep the existing training data flow and `trainingDataSource.js` helper unchanged. Add a source-structure regression test around the dataset card, then remove only the redundant JSX and its now-unused section-title copy from `ModelTrainingPage.jsx`.

**Tech Stack:** React 19, Vite 6, Node.js built-in test runner

---

### Task 1: Remove the redundant data source panel

**Files:**
- Create: `frontend/src/pages/ModelTrainingPage/modelTrainingDataSourcePanel.test.js`
- Modify: `frontend/src/pages/ModelTrainingPage.jsx:608,1555-1575`

- [ ] **Step 1: Write the failing structure test**

Create `frontend/src/pages/ModelTrainingPage/modelTrainingDataSourcePanel.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the new test and verify the expected failure**

Run from `frontend`:

```powershell
node --test src/pages/ModelTrainingPage/modelTrainingDataSourcePanel.test.js
```

Expected: FAIL in `model training parameters do not render the redundant server data source panel` because `{copy.dataSource}` is still present in the dataset card.

- [ ] **Step 3: Remove the target JSX and unused title copy**

In `frontend/src/pages/ModelTrainingPage.jsx`, remove the `dataSource` property from `copy`. Replace the beginning of the dataset summary card with:

```jsx
<div style={{ ...summaryCardStyle, padding: '16px 16px 14px' }}>
  <div style={{ ...sectionTitleStyle, marginBottom: 12 }}>{copy.trainingDataset}</div>
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      padding: 5,
      borderRadius: 16,
      background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${C.border}`,
      marginBottom: 10,
    }}
  >
```

Keep `copy.sourceDefault`, `copy.sourceHintDefault`, `getTrainingRequestDataSource()`, the dataset buttons, and the training summary metric unchanged.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run from `frontend`:

```powershell
node --test src/pages/ModelTrainingPage/modelTrainingDataSourcePanel.test.js src/pages/ModelTrainingPage/trainingDataSource.test.js
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Build the frontend**

Run from `frontend`:

```powershell
npm run build
```

Expected: Vite exits with code 0 and emits the production bundle.

- [ ] **Step 6: Verify the model training page in a browser**

Start Vite from `frontend`:

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/#/training` and verify that the dataset card begins with “训练数据集”, the removed data source block is absent, the two dataset choices remain visible, and the layout has no empty vertical gap.

- [ ] **Step 7: Commit the implementation**

```powershell
git add -- frontend/src/pages/ModelTrainingPage.jsx frontend/src/pages/ModelTrainingPage/modelTrainingDataSourcePanel.test.js docs/plans/2026-08-10-remove-training-data-source-panel.md
git commit -m "fix: remove training data source panel"
```
