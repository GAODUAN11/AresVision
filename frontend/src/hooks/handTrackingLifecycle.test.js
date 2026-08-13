import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canStartHandTracking,
  createVideoRefBinder,
  getHandTrackingStartupError,
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

test('hand tracking reports HTTPS requirement before camera startup on insecure origins', () => {
  const error = getHandTrackingStartupError({
    navigatorLike: {},
    isSecureContext: false,
    locationLike: { protocol: 'http:', hostname: '117.50.214.132' },
  });

  assert.match(error, /HTTPS/);
  assert.match(error, /localhost/);
});

test('hand tracking reports unavailable camera API without throwing', () => {
  const error = getHandTrackingStartupError({
    navigatorLike: {},
    isSecureContext: true,
    locationLike: { protocol: 'https:', hostname: 'example.com' },
  });

  assert.match(error, /camera/i);
});

test('hand tracking startup can proceed when getUserMedia is available', () => {
  const error = getHandTrackingStartupError({
    navigatorLike: { mediaDevices: { getUserMedia: async () => ({}) } },
    isSecureContext: true,
    locationLike: { protocol: 'https:', hostname: 'example.com' },
  });

  assert.equal(error, null);
});
