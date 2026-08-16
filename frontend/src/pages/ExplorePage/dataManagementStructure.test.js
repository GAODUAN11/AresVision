import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const explorePage = readFileSync(resolve(__dirname, '../ExplorePage.jsx'), 'utf8');
const defaultDatasetTab = readFileSync(resolve(__dirname, 'DefaultDatasetTab.jsx'), 'utf8');
const myDataTab = readFileSync(resolve(__dirname, 'MyDataTab.jsx'), 'utf8');
const adminReviewPanel = readFileSync(resolve(__dirname, '../../components/AdminReviewPanel.jsx'), 'utf8');

test('ExplorePage exposes three top-level data management sections', () => {
  assert.match(explorePage, /key:\s*'official'/);
  assert.match(explorePage, /key:\s*'personal'/);
  assert.match(explorePage, /key:\s*'admin'/);
  assert.doesNotMatch(explorePage, /key:\s*'governance'/);
  assert.doesNotMatch(explorePage, /<GovernanceTab\s*\/>/);
});

test('Admin Review is role-aware and hidden from non-admin navigation', () => {
  assert.match(explorePage, /isAdmin\s*\?\s*\[/);
  assert.match(explorePage, /AdminReviewWorkspace/);
});

test('official sources show MCD, OpenMARS, and NOMAD role cards', () => {
  assert.match(defaultDatasetTab, /OFFICIAL_SOURCE_CARDS/);
  assert.match(defaultDatasetTab, /key:\s*'mcd'/);
  assert.match(defaultDatasetTab, /key:\s*'openmars'/);
  assert.match(defaultDatasetTab, /key:\s*'nomad'/);
});

test('personal data keeps upload simple and moves dense details behind advanced disclosure', () => {
  assert.match(myDataTab, /advancedOpen/);
  assert.match(myDataTab, /AdvancedDetailSection/);
  assert.match(myDataTab, /copy\.advancedTitle/);
});

test('admin review content is reusable inside the page and in the drawer', () => {
  assert.match(adminReviewPanel, /export function AdminReviewWorkspace/);
  assert.match(adminReviewPanel, /PanelContent/);
});

test('admin review surfaces subscribe to a shared review refresh signal', () => {
  assert.match(adminReviewPanel, /reviewSignal/);
  assert.match(adminReviewPanel, /useEffect\(\(\)\s*=>\s*\{\s*load\(\);?\s*\},\s*\[load,\s*reviewSignal\]\)/);
  assert.match(explorePage, /AdminReviewWorkspace[^>]+reviewSignal=\{reviewSignal\}/);
});

test('personal preview loading ignores stale async responses after selection or collapse changes', () => {
  assert.match(myDataTab, /previewRequestRef/);
  assert.match(myDataTab, /requestId\s*!==\s*previewRequestRef\.current/);
  assert.match(myDataTab, /onSelectDataset/);
});
