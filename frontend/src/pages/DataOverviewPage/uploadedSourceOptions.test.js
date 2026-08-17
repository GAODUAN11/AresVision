import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOzoneCapabilitiesForSourceModes,
  buildOzoneLayerSourceSelection,
  buildOverviewUploadOptions,
  buildOverviewSourceParams,
  buildUploadYearOptions,
  filterOzoneOverlayBySourceModes,
  pickDefaultUploadId,
} from './uploadedSourceOptions.js';

test('buildOverviewUploadOptions groups usable raw uploads by overview role', () => {
  const uploads = [
    { id: 1, filename: 'bad.nc', data_type: 'mcd', status: 'invalid' },
    { id: 2, filename: 'mcd.nc', data_type: 'mcd', status: 'valid', mars_year: 34 },
    { id: 3, filename: 'om.nc', data_type: 'openmars', status: 'approved', mars_year: 34 },
    { id: 4, filename: 'nomad.nc', data_type: 'nomad', status: 'pending_review', mars_year: 34 },
    { id: 5, filename: 'rejected.nc', data_type: 'nomad', status: 'rejected', mars_year: 34 },
  ];

  const options = buildOverviewUploadOptions(uploads);

  assert.deepEqual(options.mcd.map((item) => item.id), [2]);
  assert.deepEqual(options.openmars.map((item) => item.id), [3]);
  assert.deepEqual(options.nomad.map((item) => item.id), [4]);
});

test('buildOverviewSourceParams emits only the MCD upload id for page-wide overview data', () => {
  assert.equal(buildOverviewSourceParams({}), '');
  assert.equal(
    buildOverviewSourceParams({ mcdUploadId: 12, openmarsUploadId: 34, nomadUploadId: 56 }),
    'mcd_upload_id=12'
  );
});

test('buildOzoneLayerSourceSelection automatically matches personal ozone uploads by Mars year and current Ls', () => {
  const uploads = {
    openmars: [
      { id: 11, filename: 'openmars-my33.nc', marsYear: 33, lsStart: 0, lsEnd: 360 },
      { id: 12, filename: 'openmars-my34-early.nc', marsYear: 34, lsStart: 0, lsEnd: 90 },
      { id: 13, filename: 'openmars-my34-late.nc', marsYear: 34, lsStart: 180, lsEnd: 240 },
    ],
    nomad: [
      { id: 21, filename: 'nomad-my34.nc', marsYear: 34, lsStart: 35, lsEnd: 45 },
    ],
  };

  const selection = buildOzoneLayerSourceSelection({
    mcdUploadId: 9,
    uploads,
    marsYear: 34,
    ls: 40,
    openMarsSourceMode: 'personal',
    nomadSourceMode: 'personal',
  });

  assert.deepEqual(selection.params, {
    mcdUploadId: 9,
    openmarsUploadId: 12,
    nomadUploadId: 21,
  });
  assert.equal(selection.sources.openmars.upload?.filename, 'openmars-my34-early.nc');
  assert.equal(selection.sources.nomad.upload?.filename, 'nomad-my34.nc');
});

test('buildOzoneLayerSourceSelection marks personal ozone sources unavailable when the playback Ls has no shared coverage', () => {
  const selection = buildOzoneLayerSourceSelection({
    uploads: {
      openmars: [{ id: 12, filename: 'openmars-my34-early.nc', marsYear: 34, lsStart: 0, lsEnd: 90 }],
      nomad: [{ id: 21, filename: 'nomad-my34.nc', marsYear: 34, lsStart: 35, lsEnd: 45 }],
    },
    marsYear: 34,
    ls: 160,
    openMarsSourceMode: 'personal',
    nomadSourceMode: 'personal',
  });

  assert.deepEqual(selection.params, {});
  assert.equal(selection.sources.openmars.available, false);
  assert.equal(selection.sources.nomad.available, false);
});

test('buildOzoneCapabilitiesForSourceModes swaps official ozone coverage for personal upload coverage', () => {
  const capabilities = buildOzoneCapabilitiesForSourceModes({
    officialCapabilities: {
      openmars: true,
      nomad: true,
      diff_pairs: ['MCD-OpenMARS', 'MCD-NOMAD'],
      coverage: {
        mcd: { 34: [{ start: 0, end: 360 }] },
        openmars: { 34: [{ start: 0, end: 360 }] },
        nomad: { 34: [{ start: 0, end: 20 }] },
      },
    },
    uploads: {
      openmars: [{ id: 12, marsYear: 34, lsStart: 90, lsEnd: 120 }],
      nomad: [],
    },
    openMarsSourceMode: 'personal',
    nomadSourceMode: 'personal',
  });

  assert.deepEqual(capabilities.coverage.openmars, { 34: [{ start: 90, end: 120 }] });
  assert.deepEqual(capabilities.coverage.nomad, {});
  assert.equal(capabilities.openmars, true);
  assert.equal(capabilities.nomad, false);
  assert.deepEqual(capabilities.diff_pairs, ['MCD-OpenMARS']);
});

test('filterOzoneOverlayBySourceModes removes personal ozone layers that have no matched upload at current Ls', () => {
  const filtered = filterOzoneOverlayBySourceModes(
    {
      mcd: { source: 'mcd', points: [] },
      openmars: { source: 'openmars', points: [{ lat: 0, lng: 0, val: 1 }] },
      nomad: { source: 'nomad', points: [{ lat: 0, lng: 0, val: 2 }] },
      available_sources: ['mcd', 'openmars', 'nomad'],
      diff_candidates: ['MCD-OpenMARS', 'MCD-NOMAD'],
      validation: { nomad: { sample_count: 1, points: [{ lat: 0, lng: 0, val: 1 }] } },
      capabilities: { openmars: true, nomad: true, diff_pairs: ['MCD-OpenMARS', 'MCD-NOMAD'], coverage: {} },
    },
    {
      sources: {
        openmars: { mode: 'personal', upload: null, available: false },
        nomad: { mode: 'official', upload: null, available: true },
      },
    },
  );

  assert.equal(filtered.openmars, null);
  assert.notEqual(filtered.nomad, null);
  assert.deepEqual(filtered.available_sources, ['mcd', 'nomad']);
  assert.deepEqual(filtered.diff_candidates, ['MCD-NOMAD']);
  assert.equal(filtered.capabilities.openmars, false);
  assert.equal(filtered.capabilities.nomad, true);
});

test('buildUploadYearOptions presents personal uploads as selectable Mars years', () => {
  const uploads = [
    { id: 3, filename: 'openmars-b.nc', marsYear: 35 },
    { id: 2, filename: 'openmars-a.nc', marsYear: 34 },
  ];

  assert.deepEqual(buildUploadYearOptions(uploads), [
    { value: '3', label: 'MY 35', detail: 'openmars-b.nc' },
    { value: '2', label: 'MY 34', detail: 'openmars-a.nc' },
  ]);
  assert.equal(pickDefaultUploadId(uploads), 3);
  assert.equal(pickDefaultUploadId([]), null);
});
