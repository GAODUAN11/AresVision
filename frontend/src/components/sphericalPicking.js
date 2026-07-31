function roundCoord(value, precision = 3) {
  if (!Number.isFinite(value)) return 0;
  const rounded = Number(value.toFixed(precision));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeLongitude(lng) {
  if (!Number.isFinite(lng)) return 0;
  const normalized = ((((lng + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function localPointToLatLng(point, precision = 3) {
  const x = Number(point?.x) || 0;
  const y = Number(point?.y) || 0;
  const z = Number(point?.z) || 0;
  const radius = Math.hypot(x, y, z);
  if (radius === 0) return { lat: 0, lng: 0 };

  const lat = Math.asin(Math.max(-1, Math.min(1, y / radius))) * (180 / Math.PI);
  const lng = Math.atan2(z, x) * (180 / Math.PI);

  return {
    lat: roundCoord(lat, precision),
    lng: roundCoord(normalizeLongitude(lng), precision),
  };
}

