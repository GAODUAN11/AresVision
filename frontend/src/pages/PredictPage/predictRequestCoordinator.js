export const PREDICT_REQUEST_CHANNELS = Object.freeze({
  single: 'single',
  compareMetrics: 'compare-metrics',
  compareErrorDistribution: 'compare-error-distribution',
  comparePfi: 'compare-pfi',
  performance: 'performance',
});

export function isAbortError(error) {
  return error?.name === 'AbortError'
    || error?.code === 'ABORT_ERR'
    || error?.code === 'ERR_CANCELED';
}

export function createPredictRequestCoordinator() {
  let nextRequestId = 0;
  const activeRequests = new Map();

  const isCurrent = (token, contextKey = token?.contextKey) => {
    if (!token || token.signal?.aborted) return false;
    const current = activeRequests.get(token.channel);
    return Boolean(current)
      && current.requestId === token.requestId
      && current.contextKey === contextKey
      && current.controller === token.controller;
  };

  return {
    start(channel, contextKey) {
      activeRequests.get(channel)?.controller.abort();
      const controller = new AbortController();
      const token = {
        channel,
        contextKey,
        requestId: ++nextRequestId,
        controller,
        signal: controller.signal,
      };
      activeRequests.set(channel, token);
      return token;
    },

    isCurrent,

    isLatest(token, contextKey = token?.contextKey) {
      return isCurrent(token, contextKey) && token.requestId === nextRequestId;
    },

    finish(token, contextKey = token?.contextKey) {
      return isCurrent(token, contextKey);
    },

    invalidateAll() {
      nextRequestId += 1;
      activeRequests.forEach(({ controller }) => controller.abort());
      activeRequests.clear();
    },
  };
}
