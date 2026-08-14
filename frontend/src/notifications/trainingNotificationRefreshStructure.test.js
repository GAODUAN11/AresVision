import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('failed training updates refresh the navbar notification badge', () => {
  const trainingSource = readFileSync(
    new URL('../contexts/TrainingContext.jsx', import.meta.url),
    'utf8'
  );
  const navbarSource = readFileSync(
    new URL('../components/Navbar.jsx', import.meta.url),
    'utf8'
  );

  assert.match(trainingSource, /msg\.status === 'failed'/);
  assert.match(trainingSource, /requestNotificationRefresh\(\)/);
  assert.match(navbarSource, /NOTIFICATION_REFRESH_EVENT/);
  assert.match(navbarSource, /fetchUnreadCount/);
});
