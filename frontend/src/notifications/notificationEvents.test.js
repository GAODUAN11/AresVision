import test from 'node:test';
import assert from 'node:assert/strict';

import { NOTIFICATION_REFRESH_EVENT, requestNotificationRefresh } from './notificationEvents.js';

test('dispatches the shared notification refresh event', () => {
  const eventTypes = [];
  const target = {
    dispatchEvent(event) {
      eventTypes.push(event.type);
      return true;
    },
  };

  requestNotificationRefresh(target);

  assert.deepEqual(eventTypes, [NOTIFICATION_REFRESH_EVENT]);
});
