function longitudeDelta(a, b) {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function squaredDistance(point, target) {
  const latDelta = Number(point.lat) - Number(target.lat);
  const lngDelta = longitudeDelta(Number(point.lng), Number(target.lng));
  return latDelta * latDelta + lngDelta * lngDelta;
}

function mean(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function findNearestSlicePoint(points = [], target = {}) {
  let best = null;
  let bestDistance = Infinity;
  points.forEach((point) => {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng) || !Number.isFinite(point?.val)) return;
    const distance = squaredDistance(point, target);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  });
  return best;
}

export function buildLocalPointProbe({ requested = {}, sliceData = {} } = {}) {
  const points = Array.isArray(sliceData?.points) ? sliceData.points : [];
  const nearest = findNearestSlicePoint(points, requested);
  if (!nearest) return null;

  const globalMean = mean(points.map((point) => point.val));
  const latitudeMean = mean(
    points
      .filter((point) => Number.isFinite(point?.lat) && Math.abs(point.lat - nearest.lat) < 1e-6)
      .map((point) => point.val),
  );

  return {
    status: 'local',
    variable: sliceData.variable || 'o3col',
    requested: {
      lat: Number(requested.lat),
      lng: Number(requested.lng),
      ls: Number(requested.ls ?? sliceData.ls ?? 0),
    },
    gridPoint: {
      lat: Number(nearest.lat),
      lng: Number(nearest.lng),
    },
    current: {
      ls: Number(requested.ls ?? sliceData.ls ?? 0),
      value: Number(nearest.val),
    },
    series: {
      ls: [],
      point: [],
      globalMean: [],
      latitudeMean: [],
    },
    comparison: {
      globalMean,
      latitudeMean,
      pointMinusGlobal: Number.isFinite(globalMean) ? nearest.val - globalMean : null,
      pointMinusLatitudeMean: Number.isFinite(latitudeMean) ? nearest.val - latitudeMean : null,
    },
  };
}

