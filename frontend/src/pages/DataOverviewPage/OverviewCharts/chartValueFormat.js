export function formatAdaptiveValue(value, options = {}) {
  const { fixedDigits = 3, scientificDigits = 2 } = options;
  if (!Number.isFinite(value)) return '--';
  if (Object.is(value, -0) || value === 0) return '0';

  const fixed = value.toFixed(fixedDigits);
  if (/^-?0(?:\.0+)?$/.test(fixed)) {
    return value.toExponential(scientificDigits).replace('e-', 'e-').replace('e+', 'e+');
  }
  return fixed;
}

export function formatAdaptiveSeries(values = [], options = {}) {
  return values.map((value) => [formatAdaptiveValue(value, options)]);
}

export function formatAdaptiveMatrix(matrix = [], options = {}) {
  return matrix.map((row) => row.map((value) => formatAdaptiveValue(value, options)));
}
