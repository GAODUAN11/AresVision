function isFiniteNumber(value) {
  return Number.isFinite(value);
}

export function roundValue(value, digits = 4) {
  if (!isFiniteNumber(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatInsightValue(value, digits = 4, scientificDigits = 2) {
  if (!isFiniteNumber(value)) return null;
  if (Object.is(value, -0) || value === 0) return 0;

  const rounded = roundValue(value, digits);
  if (rounded === 0) return value.toExponential(scientificDigits);
  return rounded;
}

export function summarizeSeries(values = []) {
  const valid = values.filter(isFiniteNumber);
  if (!valid.length) {
    return {
      count: 0,
      min: null,
      max: null,
      mean: null,
    };
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  return {
    count: valid.length,
    min: roundValue(min),
    max: roundValue(max),
    mean: roundValue(mean),
  };
}

export function summarizeInsightSeries(values = []) {
  const valid = values.filter(isFiniteNumber);
  if (!valid.length) {
    return {
      count: 0,
      min: null,
      max: null,
      mean: null,
    };
  }
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  return {
    count: valid.length,
    min: formatInsightValue(min),
    max: formatInsightValue(max),
    mean: formatInsightValue(mean),
  };
}

export function sampleSeries(values = [], labels = [], maxPoints = 12) {
  if (!Array.isArray(values) || !values.length) return [];
  const labelArray = Array.isArray(labels) ? labels : [];
  const count = Math.min(maxPoints, values.length);
  const step = values.length <= count ? 1 : Math.ceil(values.length / count);
  const samples = [];
  for (let index = 0; index < values.length && samples.length < count; index += step) {
    const value = values[index];
    if (!isFiniteNumber(value)) continue;
    samples.push({
      index,
      x: labelArray[index] ?? index,
      y: roundValue(value),
    });
  }
  if (!samples.length) return [];
  const lastIndex = values.length - 1;
  if (samples[samples.length - 1].index !== lastIndex && isFiniteNumber(values[lastIndex])) {
    samples.push({
      index: lastIndex,
      x: labelArray[lastIndex] ?? lastIndex,
      y: roundValue(values[lastIndex]),
    });
  }
  return samples;
}

export function sampleInsightSeries(values = [], labels = [], maxPoints = 12) {
  if (!Array.isArray(values) || !values.length) return [];
  const labelArray = Array.isArray(labels) ? labels : [];
  const count = Math.min(maxPoints, values.length);
  const step = values.length <= count ? 1 : Math.ceil(values.length / count);
  const samples = [];
  for (let index = 0; index < values.length && samples.length < count; index += step) {
    const value = values[index];
    if (!isFiniteNumber(value)) continue;
    samples.push({
      index,
      x: labelArray[index] ?? index,
      y: formatInsightValue(value),
    });
  }
  if (!samples.length) return [];
  const lastIndex = values.length - 1;
  if (samples[samples.length - 1].index !== lastIndex && isFiniteNumber(values[lastIndex])) {
    samples.push({
      index: lastIndex,
      x: labelArray[lastIndex] ?? lastIndex,
      y: formatInsightValue(values[lastIndex]),
    });
  }
  return samples;
}

export function buildOverviewSourceSnapshot(overviewSourceParams = {}) {
  if (overviewSourceParams?.mcdUploadId) {
    return {
      type: 'personal_mcd_upload',
      mcdUploadId: overviewSourceParams.mcdUploadId,
    };
  }
  return { type: 'official_mcd' };
}

export function correlation(seriesA = [], seriesB = []) {
  const pairs = seriesA
    .map((value, index) => [value, seriesB[index]])
    .filter(([a, b]) => isFiniteNumber(a) && isFiniteNumber(b));
  if (pairs.length < 3) return null;
  const meanA = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
  const meanB = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;
  const numerator = pairs.reduce((sum, [a, b]) => sum + (a - meanA) * (b - meanB), 0);
  const denomA = Math.sqrt(pairs.reduce((sum, [a]) => sum + (a - meanA) ** 2, 0));
  const denomB = Math.sqrt(pairs.reduce((sum, [, b]) => sum + (b - meanB) ** 2, 0));
  const value = numerator / ((denomA * denomB) || 1);
  return roundValue(value);
}
