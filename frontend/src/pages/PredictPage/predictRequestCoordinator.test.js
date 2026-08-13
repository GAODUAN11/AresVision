import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PREDICT_REQUEST_CHANNELS,
  createPredictRequestCoordinator,
  isAbortError,
} from './predictRequestCoordinator.js';

test('request B remains displayed when it completes before request A', () => {
  const coordinator = createPredictRequestCoordinator();
  const requestA = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:A');
  const requestB = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:B');
  let displayed = null;

  if (coordinator.isCurrent(requestB, 'model:B')) displayed = 'B';
  if (coordinator.isCurrent(requestA, 'model:A')) displayed = 'A';

  assert.equal(displayed, 'B');
  assert.equal(requestA.signal.aborted, true);
  assert.equal(requestB.signal.aborted, false);
});

test('request A cannot overwrite request B after B has completed', () => {
  const coordinator = createPredictRequestCoordinator();
  const requestA = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:A');
  const requestB = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:B');
  const state = { result: null };

  if (coordinator.isCurrent(requestB, 'model:B')) state.result = 'B';
  if (coordinator.isCurrent(requestA, 'model:A')) state.result = 'A';

  assert.deepEqual(state, { result: 'B' });
});

test('stale request finally cannot close the latest request loading state', () => {
  const coordinator = createPredictRequestCoordinator();
  const requestA = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:A');
  const requestB = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:B');
  let loading = true;

  if (coordinator.finish(requestA, 'model:A')) loading = false;
  assert.equal(loading, true);

  if (coordinator.finish(requestB, 'model:B')) loading = false;
  assert.equal(loading, false);
});

test('invalidating requests aborts them without producing a business error', () => {
  const coordinator = createPredictRequestCoordinator();
  const request = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:A');
  let error = null;

  coordinator.invalidateAll();
  const abortError = new DOMException('The operation was aborted.', 'AbortError');
  if (coordinator.isCurrent(request, 'model:A') && !isAbortError(abortError)) {
    error = abortError.message;
  }

  assert.equal(request.signal.aborted, true);
  assert.equal(error, null);
  assert.equal(isAbortError({ code: 'ERR_CANCELED' }), true);
});

test('old metrics, error distribution, and PFI comparisons cannot update new selections', () => {
  const coordinator = createPredictRequestCoordinator();
  const channels = [
    PREDICT_REQUEST_CHANNELS.compareMetrics,
    PREDICT_REQUEST_CHANNELS.compareErrorDistribution,
    PREDICT_REQUEST_CHANNELS.comparePfi,
  ];

  channels.forEach((channel) => {
    const oldRequest = coordinator.start(channel, 'compare:1,2:h:3');
    const newRequest = coordinator.start(channel, 'compare:2,3:h:3');

    assert.equal(coordinator.isCurrent(oldRequest, 'compare:1,2:h:3'), false);
    assert.equal(coordinator.isCurrent(newRequest, 'compare:2,3:h:3'), true);
    assert.equal(oldRequest.signal.aborted, true);
  });
});

test('only the latest request across channels may update the shared error state', () => {
  const coordinator = createPredictRequestCoordinator();
  const olderErrorRequest = coordinator.start(
    PREDICT_REQUEST_CHANNELS.compareErrorDistribution,
    'compare:1,2:h:3'
  );
  const latestPfiRequest = coordinator.start(
    PREDICT_REQUEST_CHANNELS.comparePfi,
    'compare:1,2:h:3'
  );

  assert.equal(coordinator.isCurrent(olderErrorRequest, 'compare:1,2:h:3'), true);
  assert.equal(coordinator.isLatest(olderErrorRequest, 'compare:1,2:h:3'), false);
  assert.equal(coordinator.isLatest(latestPfiRequest, 'compare:1,2:h:3'), true);
});

test('an old request cannot overwrite the latest prediction cache', () => {
  const coordinator = createPredictRequestCoordinator();
  const requestA = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:A');
  const requestB = coordinator.start(PREDICT_REQUEST_CHANNELS.single, 'model:B');
  const cache = {};

  if (coordinator.isCurrent(requestB, 'model:B')) cache.result = 'B';
  if (coordinator.isCurrent(requestA, 'model:A')) cache.result = 'A';

  assert.deepEqual(cache, { result: 'B' });
});
