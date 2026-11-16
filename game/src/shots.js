// Emberdrift — the screenshot scenes behind ?shot=start|play|end|nova.
// Each one plays the real rules forward from a fresh world for a fixed time,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
// The 'end' scene stages the win: the fifth star is forged and the Beacon
// lights, so the four shots read as a complete arc (title, play, nova, win).

import { FIELD, NOVA } from './config.js';
import { startGame, updateWorld } from './world.js';

const STEP = 1 / 60;
const START_SECONDS = 5;
const PLAY_SECONDS = 36;
const NOVA_SEARCH_SECONDS = 40;

function pilotInput() {
  const input = {
    pilot: { x: 0, y: 0, nova: false },
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: FIELD.width / 2, y: FIELD.height * 0.72, down: false, clicked: false, seen: true },
    axis() {
      return { x: this.pilot.x, y: this.pilot.y };
    },
    consume() {
      return false;
    },
    consumeAny(codes) {
      if (this.pilot.nova && codes.includes('Space')) {
        this.pilot.nova = false;
        return true;
      }
      // A forge opens the upgrade screen; the autopilot takes the first
      // upgrade so the scene keeps playing.
      if (codes.includes('Digit1')) return true;
      return false;
    },
    endFrame() {},
  };
  return input;
}

// Steer toward the nearest ember; the smart pilot also leans away from near
// hazards and fires the nova when it is worth it. The blind pilot only chases
// embers, so the end scene is caught out once the field speeds up.
function autopilot(state, input, smart) {
  const ship = state.ship;
  let ember = null;
  let bestDist = Infinity;
  for (const e of state.embersList) {
    const dist = Math.hypot(e.x - ship.x, e.y - ship.y);
    // Golden embers are worth the detour.
    const weight = e.kind === 'golden' ? dist * 0.45 : dist;
    if (weight < bestDist) {
      bestDist = weight;
      ember = e;
    }
  }
  let dx = 0;
  let dy = 0;
  if (ember) {
    dx = ember.x - ship.x;
    dy = ember.y - ship.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;
  } else {
    dx = (FIELD.width / 2 - ship.x) / FIELD.width;
    dy = (FIELD.height * 0.6 - ship.y) / FIELD.height;
  }
  if (smart) {
    for (const h of state.hazards) {
      const hx = ship.x - h.x;
      const hy = ship.y - h.y;
      const dist = Math.hypot(hx, hy);
      if (dist < 170 && dist > 0.01) {
        const push = (1 - dist / 170) * 2.4;
        dx += (hx / dist) * push;
        dy += (hy / dist) * push;
      }
      // Give an armed mine a wide berth: its blast is bigger than it looks.
      if (h.kind === 'mine' && h.armed > 0 && dist < 200 && dist > 0.01) {
        const push = (1 - dist / 200) * 3.2;
        dx += (hx / dist) * push;
        dy += (hy / dist) * push;
      }
    }
    let near = 0;
    for (const h of state.hazards) {
      if (Math.hypot(h.x - ship.x, h.y - ship.y) < NOVA.radius) near += 1;
    }
    if (state.core >= NOVA.cost && near >= 2) input.pilot.nova = true;
  }
  const len = Math.hypot(dx, dy) || 1;
  input.pilot.x = dx / len;
  input.pilot.y = dy / len;
  input.mouse.x = ship.x;
  input.mouse.y = ship.y;
}

function stepFor(state, input, seconds, smart) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilot(state, input, smart);
    updateWorld(state, input, null, STEP);
    input.endFrame();
    if (state.screen !== 'playing') break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the score to show. Any unknown name stages the title screen.
 */
export function stageShot(name, world) {
  const input = pilotInput();
  if (name === 'play') {
    startGame(world, null);
    // A mid-run frame, not the opening seconds: wave 3, two stars forged,
    // chasers and weavers in the field, so the shot is busy and readable.
    world.wave = 3;
    world.forged = 2;
    world.embers = 200;
    stepFor(world, input, PLAY_SECONDS, true);
    return { screen: world.screen, best: world.score };
  }
  if (name === 'end') {
    // The win, driven by the real rules: four stars forged, one ember short
    // of the fifth, a gift ember at the ship. Collecting it forges the last
    // star and lights the Beacon.
    startGame(world, null);
    world.forged = 4;
    world.embers = 499;
    world.wave = 5;
    world.hazards = [];
    world.ship.invulnerable = 999;
    world.embersList.push({ kind: 'ember', x: world.ship.x, y: world.ship.y, vx: 0, vy: 0, r: 9, phase: 0 });
    for (let i = 0; i < Math.round(5 / STEP); i += 1) {
      updateWorld(world, input, null, STEP);
      input.endFrame();
      if (world.screen === 'win') break;
    }
    return { screen: world.screen, best: world.score };
  }
  if (name === 'nova') {
    startGame(world, null);
    stepFor(world, input, 18, true);
    // Play on until a nova is worth firing, then catch the ring mid-blast.
    for (let t = 0; t < NOVA_SEARCH_SECONDS && world.screen === 'playing'; t += STEP) {
      autopilot(world, input, true);
      updateWorld(world, input, null, STEP);
      input.endFrame();
      if (world.novaRing) break;
    }
    if (world.novaRing) {
      for (let i = 0; i < Math.round(0.3 / STEP); i += 1) {
        updateWorld(world, input, null, STEP);
        input.endFrame();
      }
    }
    return { screen: world.screen, best: world.score };
  }
  for (let i = 0; i < Math.round(START_SECONDS / STEP); i += 1) {
    updateWorld(world, input, null, STEP);
    input.endFrame();
  }
  return { screen: 'title', best: 0 };
}
