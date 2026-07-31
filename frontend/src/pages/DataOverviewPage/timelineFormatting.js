export function formatTimelineLs(value, digits = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '--';

  const factor = 10 ** digits;
  const roundedValue = Math.round((numericValue + Number.EPSILON) * factor) / factor;
  const normalizedValue = Object.is(roundedValue, -0) ? 0 : roundedValue;

  return normalizedValue
    .toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}
