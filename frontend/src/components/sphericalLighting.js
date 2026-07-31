const DEG_TO_RAD = Math.PI / 180;
const MARS_OBLIQUITY_DEG = 25.19;
const DEFAULT_LIGHT_DISTANCE = 7;
const STABLE_LIGHT_AZIMUTH_DEG = 118;

const buildStableHorizontalDirection = () => ({
  x: Math.cos(STABLE_LIGHT_AZIMUTH_DEG * DEG_TO_RAD),
  z: Math.sin(STABLE_LIGHT_AZIMUTH_DEG * DEG_TO_RAD),
});

export function normalizeSolarLongitude(solarLongitudeLs) {
  if (!Number.isFinite(solarLongitudeLs)) return 0;
  return ((solarLongitudeLs % 360) + 360) % 360;
}

export function buildSeasonalSunLight(solarLongitudeLs, distance = DEFAULT_LIGHT_DISTANCE) {
  const ls = normalizeSolarLongitude(solarLongitudeLs);
  const orbitAngle = ls * DEG_TO_RAD;
  const declination = MARS_OBLIQUITY_DEG * DEG_TO_RAD * Math.sin(orbitAngle);
  const horizontal = Math.cos(declination);
  const stableHorizontal = buildStableHorizontalDirection();

  const direction = {
    x: horizontal * stableHorizontal.x,
    y: Math.sin(declination),
    z: horizontal * stableHorizontal.z,
  };

  return {
    ls,
    direction,
    position: {
      x: direction.x * distance,
      y: direction.y * distance,
      z: direction.z * distance,
    },
  };
}
