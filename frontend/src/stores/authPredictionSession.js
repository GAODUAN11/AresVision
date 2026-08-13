import { clearPredictCache, createUserPredictScope } from './predictCache.js';

let activeAuthenticatedScope = null;

export function getActiveAuthenticatedPredictScope() {
  return activeAuthenticatedScope;
}

export function beginAuthenticatedPredictionSession(userId) {
  const nextScope = createUserPredictScope(userId);
  if (!nextScope) {
    endAuthenticatedPredictionSession();
    return null;
  }

  if (activeAuthenticatedScope && activeAuthenticatedScope !== nextScope) {
    clearPredictCache(activeAuthenticatedScope);
  }
  activeAuthenticatedScope = nextScope;
  return nextScope;
}

export function endAuthenticatedPredictionSession() {
  if (activeAuthenticatedScope) clearPredictCache(activeAuthenticatedScope);
  activeAuthenticatedScope = null;
}
