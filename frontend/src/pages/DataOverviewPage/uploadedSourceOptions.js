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
