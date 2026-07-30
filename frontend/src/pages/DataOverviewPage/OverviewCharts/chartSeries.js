function finiteValue(value) {
  return Number.isFinite(value) ? value : null;
}

export function movingAverageSeries(values = [], windowSize = 15) {
  if (!Array.isArray(values) || !values.length) return [];
  const radius = Math.max(0, Math.floor(windowSize / 2));

  return values.map((_, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    const windowValues = values
      .slice(start, end)
      .map(finiteValue)
      .filter((value) => value !== null);

    if (!windowValues.length) return null;
    return windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
  });
}
