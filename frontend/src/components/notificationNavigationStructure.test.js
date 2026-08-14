import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('notification drawer opens linked training tasks through app navigation', () => {
  const panelSource = readFileSync(new URL('./NotificationPanel.jsx', import.meta.url), 'utf8');
  const navbarSource = readFileSync(new URL('./Navbar.jsx', import.meta.url), 'utf8');

  assert.match(panelSource, /getRelatedTrainingTaskId/);
  assert.match(panelSource, /setActiveTaskId\(taskId\)/);
  assert.match(panelSource, /onNavigate\?\.\('training'\)/);
  assert.match(navbarSource, /onNavigate=\{onChange\}/);
});
