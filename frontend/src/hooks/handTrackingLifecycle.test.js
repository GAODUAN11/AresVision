import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canStartHandTracking,
  createVideoRefBinder,
} from './handTrackingLifecycle.js';

test('hand tracking waits until gesture control is enabled and the video element is mounted', () => {
  assert.equal(canStartHandTracking({ enabled: false, videoElement: {} }), false);
  assert.equal(canStartHandTracking({ enabled: true, videoElement: null }), false);
  assert.equal(canStartHandTracking({ enabled: true, videoElement: {} }), true);
});

test('video ref binder records delayed video mounts so startup can retry', () => {
  const videoRef = { current: null };
  const updates = [];
  const bindVideoRef = createVideoRefBinder({
    videoRef,
    setVideoElement: (node) => updates.push(node),
  });

  const videoNode = { tagName: 'VIDEO' };
  bindVideoRef(videoNode);

  assert.equal(videoRef.current, videoNode);
  assert.deepEqual(updates, [videoNode]);

  bindVideoRef(null);

  assert.equal(videoRef.current, null);
  assert.deepEqual(updates, [videoNode, null]);
});
