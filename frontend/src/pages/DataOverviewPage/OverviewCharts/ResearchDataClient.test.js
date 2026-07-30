import test from 'node:test';
import assert from 'node:assert/strict';

import { loadResearchSuiteCached } from './ResearchDataClient.js';

function installFetchRecorder() {
  const calls = [];
  globalThis.localStorage = { getItem: () => null, removeItem: () => {} };
  globalThis.window = { dispatchEvent: () => {} };
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ trend_lines: { ls: [], series: {} } }),
    };
  };
  return calls;
}

test('research suite cache separates uploaded overview source selections', async () => {
  const calls = installFetchRecorder();

  await loadResearchSuiteCached(34, { mcdUploadId: 1 });
  await loadResearchSuiteCached(34, { mcdUploadId: 2 });

  assert.equal(calls.length, 2);
  assert.equal(calls[0], '/api/explore/overview/research-suite?my=34&mcd_upload_id=1');
  assert.equal(calls[1], '/api/explore/overview/research-suite?my=34&mcd_upload_id=2');
});
