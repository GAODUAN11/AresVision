const USABLE_UPLOAD_STATUSES = new Set(['valid', 'pending_review', 'approved']);
const SOURCE_MODES = new Set(['official', 'personal']);

function normalizeType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUpload(upload) {
  return {
    id: Number(upload.id),
    filename: upload.filename || `Upload #${upload.id}`,
    dataType: normalizeType(upload.data_type ?? upload.dataType),
    status: upload.status || '',
    marsYear: upload.mars_year ?? upload.marsYear ?? null,
    lsStart: upload.ls_start ?? upload.lsStart ?? null,
    lsEnd: upload.ls_end ?? upload.lsEnd ?? null,
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
} = {}) {
  const params = new URLSearchParams();
  if (mcdUploadId) params.set('mcd_upload_id', String(mcdUploadId));
  return params.toString();
}

function normalizeSourceMode(mode) {
  const value = String(mode || 'official').trim().toLowerCase();
  return SOURCE_MODES.has(value) ? value : 'official';
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uploadCoversLs(upload, ls) {
  const value = finiteNumber(ls);
  const start = finiteNumber(upload?.lsStart);
  const end = finiteNumber(upload?.lsEnd);
  if (value == null || start == null || end == null) return false;
  if (start <= end) return value >= start && value <= end;
  return value >= start || value <= end;
}

export function pickMatchingUploadForMarsYearAndLs(uploads = [], { marsYear, ls } = {}) {
  const year = finiteNumber(marsYear);
  if (year == null) return null;
  for (const upload of uploads || []) {
    const item = normalizeUpload(upload);
    if (!Number.isFinite(item.id)) continue;
    if (finiteNumber(item.marsYear) !== year) continue;
    if (uploadCoversLs(item, ls)) return item;
  }
  return null;
}

function buildCoverageFromUploads(uploads = []) {
  const coverage = {};
  for (const upload of uploads || []) {
    const item = normalizeUpload(upload);
    const year = finiteNumber(item.marsYear);
    const start = finiteNumber(item.lsStart);
    const end = finiteNumber(item.lsEnd);
    if (!Number.isFinite(item.id) || year == null || start == null || end == null) continue;
    const yearKey = String(year);
    if (!coverage[yearKey]) coverage[yearKey] = [];
    coverage[yearKey].push({ start, end });
  }
  for (const intervals of Object.values(coverage)) {
    intervals.sort((a, b) => Math.min(a.start, a.end) - Math.min(b.start, b.end));
  }
  return coverage;
}

export function buildOzoneLayerSourceSelection({
  mcdUploadId = null,
  uploads = {},
  marsYear = null,
  ls = null,
  openMarsSourceMode = 'official',
  nomadSourceMode = 'official',
} = {}) {
  const openmarsMode = normalizeSourceMode(openMarsSourceMode);
  const nomadMode = normalizeSourceMode(nomadSourceMode);
  const openmarsUpload = openmarsMode === 'personal'
    ? pickMatchingUploadForMarsYearAndLs(uploads.openmars, { marsYear, ls })
    : null;
  const nomadUpload = nomadMode === 'personal'
    ? pickMatchingUploadForMarsYearAndLs(uploads.nomad, { marsYear, ls })
    : null;
  const params = {};
  if (mcdUploadId) params.mcdUploadId = mcdUploadId;
  if (openmarsUpload?.id) params.openmarsUploadId = openmarsUpload.id;
  if (nomadUpload?.id) params.nomadUploadId = nomadUpload.id;

  return {
    params,
    sources: {
      openmars: {
        mode: openmarsMode,
        upload: openmarsUpload,
        uploadId: openmarsUpload?.id ?? null,
        available: openmarsMode === 'official' || Boolean(openmarsUpload),
      },
      nomad: {
        mode: nomadMode,
        upload: nomadUpload,
        uploadId: nomadUpload?.id ?? null,
        available: nomadMode === 'official' || Boolean(nomadUpload),
      },
    },
  };
}

export function buildOzoneCapabilitiesForSourceModes({
  officialCapabilities = {},
  uploads = {},
  openMarsSourceMode = 'official',
  nomadSourceMode = 'official',
} = {}) {
  const openmarsMode = normalizeSourceMode(openMarsSourceMode);
  const nomadMode = normalizeSourceMode(nomadSourceMode);
  const officialCoverage = officialCapabilities?.coverage || {};
  const personalOpenMarsCoverage = buildCoverageFromUploads(uploads.openmars);
  const personalNomadCoverage = buildCoverageFromUploads(uploads.nomad);
  const coverage = {
    ...officialCoverage,
    mcd: officialCoverage.mcd || {},
    openmars: openmarsMode === 'personal' ? personalOpenMarsCoverage : (officialCoverage.openmars || {}),
    nomad: nomadMode === 'personal' ? personalNomadCoverage : (officialCoverage.nomad || {}),
  };
  const openmarsAvailable = openmarsMode === 'personal'
    ? Object.keys(personalOpenMarsCoverage).length > 0
    : Boolean(officialCapabilities?.openmars);
  const nomadAvailable = nomadMode === 'personal'
    ? Object.keys(personalNomadCoverage).length > 0
    : Boolean(officialCapabilities?.nomad);
  const diffPairs = [];
  if (openmarsAvailable) diffPairs.push('MCD-OpenMARS');
  if (nomadAvailable) diffPairs.push('MCD-NOMAD');

  return {
    ...officialCapabilities,
    openmars: openmarsAvailable,
    nomad: nomadAvailable,
    diff_pairs: diffPairs,
    coverage,
  };
}

export function filterOzoneOverlayBySourceModes(payload, selection) {
  if (!payload) return payload;
  const openmarsSelection = selection?.sources?.openmars;
  const nomadSelection = selection?.sources?.nomad;
  const allowOpenMars = openmarsSelection?.mode !== 'personal' || Boolean(openmarsSelection?.uploadId || openmarsSelection?.upload);
  const allowNomad = nomadSelection?.mode !== 'personal' || Boolean(nomadSelection?.uploadId || nomadSelection?.upload);
  const next = {
    ...payload,
    validation: { ...(payload.validation || {}) },
    capabilities: { ...(payload.capabilities || {}) },
  };

  if (!allowOpenMars) next.openmars = null;
  if (!allowNomad) {
    next.nomad = null;
    next.validation.nomad = null;
  }

  next.available_sources = [
    ['mcd', next.mcd],
    ['openmars', next.openmars],
    ['nomad', next.nomad],
  ]
    .filter(([, layer]) => layer != null)
    .map(([source]) => source);

  next.diff_candidates = [];
  if (next.openmars != null) next.diff_candidates.push('MCD-OpenMARS');
  if (next.nomad != null) next.diff_candidates.push('MCD-NOMAD');
  next.capabilities.openmars = next.openmars != null;
  next.capabilities.nomad = next.nomad != null;
  next.capabilities.diff_pairs = next.diff_candidates;
  return next;
}
