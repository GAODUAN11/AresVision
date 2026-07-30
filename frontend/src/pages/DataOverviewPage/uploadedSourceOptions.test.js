import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOverviewUploadOptions,
  buildOverviewSourceParams,
  buildUploadYearOptions,
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

test('buildOverviewSourceParams emits explicit upload ids only when selected', () => {
  assert.equal(buildOverviewSourceParams({}), '');
  assert.equal(
    buildOverviewSourceParams({ mcdUploadId: 12, openmarsUploadId: 34, nomadUploadId: 56 }),
    'mcd_upload_id=12&openmars_upload_id=34&nomad_upload_id=56'
  );
});

test('buildUploadYearOptions presents personal uploads as selectable Mars years', () => {
  const uploads = [
    { id: 3, filename: 'openmars-b.nc', marsYear: 35 },
    { id: 2, filename: 'openmars-a.nc', marsYear: 34 },
  ];

  assert.deepEqual(buildUploadYearOptions(uploads), [
    { value: '3', label: 'MY 35 - openmars-b.nc' },
    { value: '2', label: 'MY 34 - openmars-a.nc' },
  ]);
  assert.equal(pickDefaultUploadId(uploads), 3);
  assert.equal(pickDefaultUploadId([]), null);
});
