import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createHandGestureState,
  interpretHandGestureFrame,
} from './handGestureInterpreter.js';

function makeHand({ x = 0.5, y = 0.5, shape = 'open' } = {}) {
  const hand = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  hand[0] = { x, y: y + 0.22, z: 0 };
  hand[9] = { x, y, z: 0 };

  [
    { mcp: 5, pip: 6, tip: 8, dx: -0.08 },
    { mcp: 9, pip: 10, tip: 12, dx: -0.02 },
    { mcp: 13, pip: 14, tip: 16, dx: 0.04 },
    { mcp: 17, pip: 18, tip: 20, dx: 0.09 },
  ].forEach(({ mcp, pip, tip, dx }) => {
    hand[mcp] = { x: x + dx, y: y + 0.02, z: 0 };
    if (shape === 'fist') {
      hand[pip] = { x: x + dx, y: y + 0.07, z: 0 };
      hand[tip] = { x: x + dx, y: y + 0.13, z: 0 };
    } else {
      hand[pip] = { x: x + dx, y: y - 0.08, z: 0 };
      hand[tip] = { x: x + dx, y: y - 0.18, z: 0 };
    }
  });

  return hand;
}

test('open palm dwell emits point hover progress and then a point selection', () => {
  const state = createHandGestureState();
  const options = { hoverDwellMs: 600 };

  let frame = interpretHandGestureFrame({ hands: [makeHand({ x: 0.4, y: 0.38 })], timestamp: 0 }, state, options);
  assert.equal(frame.events.some((event) => event.type === 'selectPoint'), false);

  frame = interpretHandGestureFrame({ hands: [makeHand({ x: 0.4, y: 0.38 })], timestamp: 300 }, state, options);
  const hover = frame.events.find((event) => event.type === 'pointHover');
  assert.ok(hover);
  assert.equal(hover.progress > 0 && hover.progress < 1, true);

  frame = interpretHandGestureFrame({ hands: [makeHand({ x: 0.4, y: 0.38 })], timestamp: 650 }, state, options);
  const selection = frame.events.find((event) => event.type === 'selectPoint');
  assert.ok(selection);
  assert.equal(Number(selection.x.toFixed(3)), 0.61);
});

test('fist toggles timeline once until the hand opens again', () => {
  const state = createHandGestureState();

  let frame = interpretHandGestureFrame({ hands: [makeHand({ shape: 'fist' })], timestamp: 100 }, state);
  assert.equal(frame.events.filter((event) => event.type === 'toggleTimeline').length, 1);

  frame = interpretHandGestureFrame({ hands: [makeHand({ shape: 'fist' })], timestamp: 2000 }, state);
  assert.equal(frame.events.some((event) => event.type === 'toggleTimeline'), false);

  interpretHandGestureFrame({ hands: [makeHand({ shape: 'open' })], timestamp: 2100 }, state);
  frame = interpretHandGestureFrame({ hands: [makeHand({ shape: 'fist' })], timestamp: 2200 }, state);
  assert.equal(frame.events.filter((event) => event.type === 'toggleTimeline').length, 1);
});

test('two hands moving apart still emit zoom events', () => {
  const state = createHandGestureState();

  interpretHandGestureFrame({
    hands: [makeHand({ x: 0.42 }), makeHand({ x: 0.58 })],
    timestamp: 0,
  }, state);

  const frame = interpretHandGestureFrame({
    hands: [makeHand({ x: 0.32 }), makeHand({ x: 0.68 })],
    timestamp: 100,
  }, state);

  const zoom = frame.events.find((event) => event.type === 'zoom');
  assert.ok(zoom);
  assert.equal(zoom.dDist > 0, true);
});

test('single hand movement keeps emitting rotate events', () => {
  const state = createHandGestureState();

  interpretHandGestureFrame({ hands: [makeHand({ x: 0.5, y: 0.45 })], timestamp: 0 }, state);
  const frame = interpretHandGestureFrame({ hands: [makeHand({ x: 0.57, y: 0.48 })], timestamp: 100 }, state);

  assert.equal(frame.events.some((event) => event.type === 'rotate'), true);
});
