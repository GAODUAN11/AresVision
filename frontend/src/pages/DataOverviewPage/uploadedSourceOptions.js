const USABLE_UPLOAD_STATUSES = new Set(['valid', 'pending_review', 'approved']);

function normalizeType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUpload(upload) {
  return {
    id: Number(upload.id),
    filename: upload.filename || `Upload #${upload.id}`,
    dataType: normalizeType(upload.data_type),
    status: upload.status || '',
    marsYear: upload.mars_year ?? null,
    lsStart: upload.ls_start ?? null,
    lsEnd: upload.ls_end ?? null,
  };
}

function marsYearSortValue(upload) {
  const year = Number(upload?.marsYear);
  return Number.isFinite(year) ? year : -Infinity;
}

export function buildOverviewUploadOptions(uploads = []) {
  const grouped = { mcd: [], openmars: [], nomad: [] };
  for (const upload of uploads || []) {
    const item = normalizeUpload(upload);
    if (!Number.isFinite(item.id) || !USABLE_UPLOAD_STATUSES.has(item.status)) continue;
    if (item.dataType === 'mcd') grouped.mcd.push(item);
    if (item.dataType === 'openmars') grouped.openmars.push(item);
    if (item.dataType === 'nomad') grouped.nomad.push(item);
  }
  return grouped;
}

export function buildUploadYearOptions(uploads = []) {
  return [...(uploads || [])]
    .filter((item) => Number.isFinite(Number(item?.id)))
    .sort((a, b) => {
      const yearDiff = marsYearSortValue(b) - marsYearSortValue(a);
      if (yearDiff !== 0) return yearDiff;
      const filenameDiff = String(a.filename || '').localeCompare(String(b.filename || ''));
      if (filenameDiff !== 0) return filenameDiff;
      return Number(a.id) - Number(b.id);
    })
    .map((item) => ({
      value: String(item.id),
      label: `MY ${item.marsYear ?? '--'} - ${item.filename}`,
    }));
}

export function pickDefaultUploadId(uploads = []) {
  const first = buildUploadYearOptions(uploads)[0];
  return first ? Number(first.value) : null;
}

export function buildOverviewSourceParams({
  mcdUploadId = null,
  openmarsUploadId = null,
  nomadUploadId = null,
} = {}) {
  const params = new URLSearchParams();
  if (mcdUploadId) params.set('mcd_upload_id', String(mcdUploadId));
  if (openmarsUploadId) params.set('openmars_upload_id', String(openmarsUploadId));
  if (nomadUploadId) params.set('nomad_upload_id', String(nomadUploadId));
  return params.toString();
}
