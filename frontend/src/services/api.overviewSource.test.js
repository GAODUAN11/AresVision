import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchOverviewInfo, fetchOverviewOzoneSources, fetchOverviewPointProbe } from './api.js';

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
      json: async () => ({}),
    };
  };
  return calls;
}

test('overview API calls use explicit upload ids instead of legacy data_source', async () => {
  const calls = installFetchRecorder();

  await fetchOverviewInfo({ dataSource: 'personal', mcdUploadId: 12 });
  await fetchOverviewOzoneSources(34, 95, { openmarsUploadId: 45, nomadUploadId: 67 });

  assert.equal(calls[0], '/api/explore/overview/info?mcd_upload_id=12');
  assert.equal(calls[1], '/api/explore/overview/ozone-sources?my=34&ls=95&openmars_upload_id=45&nomad_upload_id=67');
});

test('overview point probe API includes click coordinates and uploaded MCD source id', async () => {
  const calls = installFetchRecorder();

  await fetchOverviewPointProbe(34, 2.25, -176, 11, 'Temperature', { mcdUploadId: 12 });

  assert.equal(calls[0], '/api/explore/overview/point-probe?my=34&lat=2.25&lng=-176&ls=11&variable=Temperature&mcd_upload_id=12');
});
