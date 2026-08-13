const DEG_TO_RAD = Math.PI / 180;
const DEFAULT_BASE_RADIUS = 0.9;

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function createRandom(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildInterpolationCell(nLat, nLon, liFloat, ljFloat) {
  if (!nLat || !nLon) return NaN;

  let j0 = Math.floor(ljFloat);
  let j1 = j0 + 1;
  const dj = ljFloat - j0;
  j0 = ((j0 % nLon) + nLon) % nLon;
  j1 = ((j1 % nLon) + nLon) % nLon;

  let i0 = Math.floor(liFloat);
  let i1 = i0 + 1;
  const di = liFloat - i0;
  i0 = Math.max(0, Math.min(nLat - 1, i0));
  i1 = Math.max(0, Math.min(nLat - 1, i1));

  return {
    indexes: [
      i0 * nLon + j0,
      i0 * nLon + j1,
      i1 * nLon + j0,
      i1 * nLon + j1,
    ],
    weights: [
      (1 - di) * (1 - dj),
      (1 - di) * dj,
      di * (1 - dj),
      di * dj,
    ],
  };
}

function readGridValue(field, nLon, flatIndex) {
  const row = Math.floor(flatIndex / nLon);
  const col = flatIndex % nLon;
  return field[row]?.[col];
}

function interpolateFromCell(field, nLon, cellIndexes, cellWeights, offset) {
  const val00 = readGridValue(field, nLon, cellIndexes[offset]);
  const val01 = readGridValue(field, nLon, cellIndexes[offset + 1]);
  const val10 = readGridValue(field, nLon, cellIndexes[offset + 2]);
  const val11 = readGridValue(field, nLon, cellIndexes[offset + 3]);
  if (![val00, val01, val10, val11].every(Number.isFinite)) return NaN;

  return val00 * cellWeights[offset]
    + val01 * cellWeights[offset + 1]
    + val10 * cellWeights[offset + 2]
    + val11 * cellWeights[offset + 3];
}

function latLonDirection(latDeg, lonDeg) {
  const phi = (90 - latDeg) * DEG_TO_RAD;
  const theta = lonDeg * DEG_TO_RAD;
  return [
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ];
}

function resolveRange(field, minVal, maxVal, colorMode) {
  if (colorMode === 'rdbu') {
    let absMax = 0;
    for (let li = 0; li < field.length; li += 1) {
      for (let lj = 0; lj < (field[li]?.length || 0); lj += 1) {
        const value = field[li][lj];
        if (Number.isFinite(value)) absMax = Math.max(absMax, Math.abs(value));
      }
    }
    const maxAbs = absMax || 1;
    return { dMin: -maxAbs, dMax: maxAbs, range: maxAbs * 2 || 1 };
  }

  const dMin = Number.isFinite(minVal) ? minVal : 0;
  const dMax = Number.isFinite(maxVal) ? maxVal : 1;
  return { dMin, dMax, range: dMax - dMin || 1 };
}

function parseTintRgb(tint, valueRatio) {
  const match = typeof tint === 'string' ? tint.match(/^#?([0-9a-f]{6})$/i) : null;
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  const brightness = 0.52 + clamp01(valueRatio) * 0.48;
  return [
    ((value >> 16) & 255) / 255 * brightness,
    ((value >> 8) & 255) / 255 * brightness,
    (value & 255) / 255 * brightness,
  ];
}

function writeColor(colors, offset, rgb) {
  colors[offset] = rgb[0];
  colors[offset + 1] = rgb[1];
  colors[offset + 2] = rgb[2];
}

export function buildGridParticleSamples(field, {
  particleDensity = 120,
  radiusOffset = 0,
  seed = 1,
} = {}) {
  const nLat = field?.length || 0;
  const nLon = field?.[0]?.length || 0;
  const safeDensity = Math.max(1, Math.round(particleDensity));
  const latitudes = [];
  const longitudes = [];
  const cellIndexes = [];
  const cellWeights = [];
  const radiusJitter = [];
  const directions = [];
  const random = createRandom(seed);

  for (let li = 0; li < nLat; li += 1) {
    for (let lj = 0; lj < nLon; lj += 1) {
      const latCenter = nLat > 1 ? 90 - (li / (nLat - 1)) * 180 : 0;
      const lonCenter = (lj / Math.max(1, nLon)) * 360;
      for (let p = 0; p < safeDensity; p += 1) {
        const latJitter = latCenter + (random() - 0.5) * (180 / Math.max(1, nLat));
        const lonJitter = lonCenter + (random() - 0.5) * (360 / Math.max(1, nLon));
        const [x, y, z] = latLonDirection(latJitter, lonJitter);

        latitudes.push(latJitter);
        longitudes.push(lonJitter);
        const liFloat = nLat > 1 ? ((90 - latJitter) / 180) * (nLat - 1) : 0;
        const ljFloat = (lonJitter / 360) * Math.max(1, nLon);
        const interpolationCell = buildInterpolationCell(nLat, nLon, liFloat, ljFloat);
        cellIndexes.push(...interpolationCell.indexes);
        cellWeights.push(...interpolationCell.weights);
        radiusJitter.push((random() - 0.5) * 0.005);
        directions.push(x, y, z);
      }
    }
  }

  return {
    type: 'grid',
    signature: `grid:${nLat}x${nLon}:${safeDensity}:${radiusOffset}`,
    count: latitudes.length,
    latitudes: Float32Array.from(latitudes),
    longitudes: Float32Array.from(longitudes),
    cellIndexes: Uint32Array.from(cellIndexes),
    cellWeights: Float32Array.from(cellWeights),
    radiusJitter: Float32Array.from(radiusJitter),
    directions: Float32Array.from(directions),
  };
}

export function updateGridParticleBuffers({
  samples,
  fieldData,
  colorMode = 'inferno',
  colormap = 'inferno',
  positions,
  colors,
  colorMapper,
  tint = null,
  baseRadius = DEFAULT_BASE_RADIUS,
  radiusOffset = 0,
  equatorHighlight = false,
}) {
  const field = fieldData?.field;
  if (!samples || !field?.length || !positions || !colors) return { count: 0 };

  const { dMin, dMax, range } = resolveRange(field, fieldData.minVal, fieldData.maxVal, colorMode);
  const nLon = field[0]?.length || 0;
  for (let i = 0; i < samples.count; i += 1) {
    const cellOffset = i * 4;
    const interpVal = interpolateFromCell(field, nLon, samples.cellIndexes, samples.cellWeights, cellOffset);
    if (!Number.isFinite(interpVal)) {
      const offset = i * 3;
      positions[offset] = 0;
      positions[offset + 1] = 0;
      positions[offset + 2] = 0;
      colors[offset] = 0;
      colors[offset + 1] = 0;
      colors[offset + 2] = 0;
      continue;
    }
    const t = clamp01((Math.max(dMin, Math.min(dMax, interpVal)) - dMin) / range);
    const heightOffset = colorMode === 'rdbu' ? (t - 0.5) * 0.3 : t * 0.225;
    const radius = baseRadius + radiusOffset + heightOffset + samples.radiusJitter[i];
    const offset = i * 3;

    positions[offset] = radius * samples.directions[offset];
    positions[offset + 1] = radius * samples.directions[offset + 1];
    positions[offset + 2] = radius * samples.directions[offset + 2];

    if (equatorHighlight && Math.abs(samples.latitudes[i]) < 1.5) {
      writeColor(colors, offset, [1, 0.4, 0.4]);
      continue;
    }

    const tinted = tint ? parseTintRgb(tint, t) : null;
    writeColor(colors, offset, tinted || colorMapper(colorMode, colormap, t));
  }

  return { count: samples.count, min: dMin, max: dMax };
}

function pointSignature(points, radiusOffset) {
  const parts = (points || []).map((point) => [
    Number(point?.lat || 0).toFixed(3),
    Number(point?.lng || 0).toFixed(3),
    Math.round(16 * Math.min(3, Math.max(1, Math.sqrt(Math.max(1, point?.count || 1))))),
  ].join(':'));
  return `points:${radiusOffset}:${parts.join('|')}`;
}

export function buildPointParticleSamples(points, {
  radiusOffset = 0,
  seed = 1,
} = {}) {
  const pointIndexes = [];
  const radiusJitter = [];
  const directions = [];
  const random = createRandom(seed);

  (points || []).forEach((point, pointIndex) => {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) return;
    const countBoost = Math.min(3, Math.max(1, Math.sqrt(Math.max(1, point.count || 1))));
    const particleCount = Math.round(16 * countBoost);

    for (let p = 0; p < particleCount; p += 1) {
      const latJitter = point.lat + (random() - 0.5) * 1.8;
      const lonJitter = point.lng + (random() - 0.5) * 1.8;
      const [x, y, z] = latLonDirection(latJitter, lonJitter);
      pointIndexes.push(pointIndex);
      radiusJitter.push((random() - 0.5) * 0.01);
      directions.push(x, y, z);
    }
  });

  return {
    type: 'points',
    signature: pointSignature(points, radiusOffset),
    count: pointIndexes.length,
    pointIndexes: Uint32Array.from(pointIndexes),
    radiusJitter: Float32Array.from(radiusJitter),
    directions: Float32Array.from(directions),
  };
}

export function updatePointParticleBuffers({
  samples,
  points,
  colorMode = 'rdbu',
  positions,
  colors,
  colorMapper,
  tint = '#34d399',
  baseRadius = DEFAULT_BASE_RADIUS,
  radiusOffset = 0,
}) {
  if (!samples || !Array.isArray(points) || !positions || !colors) return { count: 0 };
  const values = points.map((point) => point?.val).filter(Number.isFinite);
  const absMax = Math.max(1, ...values.map((value) => Math.abs(value)));

  for (let i = 0; i < samples.count; i += 1) {
    const point = points[samples.pointIndexes[i]];
    const value = Number.isFinite(point?.val) ? point.val : 0;
    const t = colorMode === 'rdbu'
      ? clamp01((Math.max(-absMax, Math.min(absMax, value)) + absMax) / (2 * absMax))
      : 0.5;
    const offset = i * 3;
    const radius = baseRadius + radiusOffset + samples.radiusJitter[i];

    positions[offset] = radius * samples.directions[offset];
    positions[offset + 1] = radius * samples.directions[offset + 1];
    positions[offset + 2] = radius * samples.directions[offset + 2];

    const rgb = colorMode === 'rdbu'
      ? colorMapper('rdbu', 'rdbu', t)
      : (parseTintRgb(tint, t) || colorMapper(colorMode, 'inferno', t));
    writeColor(colors, offset, rgb);
  }

  return { count: samples.count };
}
