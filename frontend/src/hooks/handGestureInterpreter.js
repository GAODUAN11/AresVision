const DEFAULT_OPTIONS = {
  rotateThreshold: 0.005,
  zoomThreshold: 0.01,
  hoverMovementTolerance: 0.025,
  hoverDwellMs: 850,
};

const FINGER_JOINTS = [
  { tip: 8, pip: 6 },
  { tip: 12, pip: 10 },
  { tip: 16, pip: 14 },
  { tip: 20, pip: 18 },
];

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function palmCenter(hand) {
  const wrist = hand?.[0];
  const middleMcp = hand?.[9];
  if (!wrist || !middleMcp) return null;
  return {
    x: (Number(wrist.x) + Number(middleMcp.x)) / 2,
    y: (Number(wrist.y) + Number(middleMcp.y)) / 2,
  };
}

function classifyHandShape(hand) {
  if (!Array.isArray(hand)) return 'unknown';
  const extendedCount = FINGER_JOINTS.reduce((count, { tip, pip }) => {
    const tipPoint = hand[tip];
    const pipPoint = hand[pip];
    if (!tipPoint || !pipPoint) return count;
    return Number(tipPoint.y) < Number(pipPoint.y) - 0.025 ? count + 1 : count;
  }, 0);

  if (extendedCount >= 3) return 'open';
  if (extendedCount === 0) return 'fist';
  return 'neutral';
}

function resetHover(state) {
  state.hoverX = null;
  state.hoverY = null;
  state.hoverStartAt = null;
  state.hoverSelected = false;
}

function resetMotion(state) {
  state.x = null;
  state.y = null;
  state.dist = null;
}

function handPairDistance(hands) {
  const first = palmCenter(hands[0]);
  const second = palmCenter(hands[1]);
  if (!first || !second) return null;
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function addOpenPalmHoverEvents({ events, state, center, pointer, timestamp, options }) {
  const hoverDistance = state.hoverX == null
    ? Infinity
    : Math.hypot(center.x - state.hoverX, center.y - state.hoverY);

  if (state.hoverStartAt == null || hoverDistance > options.hoverMovementTolerance) {
    state.hoverX = center.x;
    state.hoverY = center.y;
    state.hoverStartAt = timestamp;
    state.hoverSelected = false;
  }

  const elapsed = Math.max(0, timestamp - state.hoverStartAt);
  const progress = clamp01(elapsed / options.hoverDwellMs);
  events.push({ type: 'pointHover', x: pointer.x, y: pointer.y, progress });

  if (progress >= 1 && !state.hoverSelected) {
    state.hoverSelected = true;
    events.push({ type: 'selectPoint', x: pointer.x, y: pointer.y });
  }
}

export function createHandGestureState() {
  return {
    x: null,
    y: null,
    dist: null,
    activeHands: 0,
    hoverX: null,
    hoverY: null,
    hoverStartAt: null,
    hoverSelected: false,
    fistArmed: true,
  };
}

export function interpretHandGestureFrame({ hands, timestamp = 0 }, state, customOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const safeHands = Array.isArray(hands) ? hands : [];
  const events = [];

  if (safeHands.length === 0) {
    resetMotion(state);
    resetHover(state);
    state.activeHands = 0;
    state.fistArmed = true;
    events.push({ type: 'status', mode: 'idle' });
    return { events, status: { mode: 'idle' } };
  }

  if (safeHands.length === 1) {
    const hand = safeHands[0];
    const center = palmCenter(hand);
    if (!center) return { events, status: { mode: 'idle' } };

    const shape = classifyHandShape(hand);
    const pointer = {
      x: clamp01(1 - center.x),
      y: clamp01(center.y),
    };
    events.push({ type: 'pointerMove', x: pointer.x, y: pointer.y, shape });

    if (shape === 'fist') {
      if (state.fistArmed) {
        events.push({ type: 'toggleTimeline' });
        state.fistArmed = false;
      }
      resetMotion(state);
      resetHover(state);
      state.activeHands = 1;
      events.push({ type: 'status', mode: 'fist' });
      return { events, status: { mode: 'fist' } };
    }

    state.fistArmed = true;

    if (state.activeHands === 1 && state.x !== null) {
      const dx = -(center.x - state.x);
      const dy = center.y - state.y;
      if (Math.abs(dx) > options.rotateThreshold || Math.abs(dy) > options.rotateThreshold) {
        events.push({ type: 'rotate', dx, dy });
      }
    }

    if (shape === 'open') {
      addOpenPalmHoverEvents({ events, state, center, pointer, timestamp, options });
    } else {
      resetHover(state);
    }

    state.x = center.x;
    state.y = center.y;
    state.dist = null;
    state.activeHands = 1;
    events.push({ type: 'status', mode: shape === 'open' ? 'open-palm' : 'rotate' });
    return { events, status: { mode: shape === 'open' ? 'open-palm' : 'rotate' } };
  }

  const currentDist = handPairDistance(safeHands);
  resetHover(state);
  state.fistArmed = true;

  if (currentDist != null && state.activeHands === 2 && state.dist !== null) {
    const dDist = currentDist - state.dist;
    if (Math.abs(dDist) > options.zoomThreshold) {
      events.push({ type: 'zoom', dDist });
    }
  }

  state.x = null;
  state.y = null;
  state.dist = currentDist;
  state.activeHands = 2;
  events.push({ type: 'status', mode: 'zoom' });
  return { events, status: { mode: 'zoom' } };
}
