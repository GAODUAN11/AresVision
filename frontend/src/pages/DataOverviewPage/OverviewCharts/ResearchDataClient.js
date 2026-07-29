import { fetchOverviewResearchSuite } from '../../../services/api.js';

const suiteCache = new Map();

export async function loadResearchSuiteCached(marsYear, options = {}) {
  const key = [
    marsYear,
    options?.mcdUploadId || 'official-mcd',
    options?.openmarsUploadId || 'official-openmars',
    options?.nomadUploadId || 'official-nomad',
  ].join(':');
  if (!suiteCache.has(key)) {
    suiteCache.set(key, fetchOverviewResearchSuite(marsYear, options));
  }
  try {
    return await suiteCache.get(key);
  } catch (error) {
    suiteCache.delete(key);
    throw error;
  }
}
