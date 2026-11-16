// Emberdrift — the game itself: screens, scoring, waves, collisions, the nova.
// The state machine is title -> playing -> over, with pause inside playing.
// Everything the render loop draws comes from this state, and nothing else.

import {
  EMBER, FIELD, FORGE_BONUS, FORGE_CALM_SECONDS, FORGE_EVERY_EMBERS,
  HULL, KEYS, NOVA, SHIP, SPAWN,
} from './config.js';
import {
  burstEmber, burstHit, burstNova, makeShip, spawnEmber, spawnFloater,
  spawnParticle, spawnRock, spawnSmallRocks, updateEntities,
} from './entities.js';
import { chance, mulberry32, range } from './random.js';

const BEST_KEY = 'emberdrift.best';

function loadBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the best score just does not persist.
  }
}

function makeStars(rng) {
  const stars = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const count = layer === 0 ? 70 : layer === 1 ? 45 : 26;
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: range(rng, 0, FIELD.width),
        y: range(rng, 0, FIELD.height),
        r: layer === 0 ? range(rng, 0.6, 1.1) : layer === 1 ? range(rng, 1.0, 1.7) : range(rng, 1.5, 2.4),
        layer,
        tw: range(rng, 0, Math.PI * 2),
        speed: 6 + layer * 10,
      });
    }
  }
  return stars;
}

export function createWorld(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    time: 0,
    screen: 'title',
    score: 0,
    best: loadBest(),
    embers: 0,
    forged: 0,
    wave: 1,
    core: 0,
    hull: HULL.start,
    maxHull: HULL.start,
    combo: 0,
    comboTimer: 0,
    ship: makeShip(),
    embersList: [],
    hazards: [],
    particles: [],
    floaters: [],
    novaRing: null,
    spawnTimers: { ember: 0.4, rock: 1.2, chaser: 6, splitter: 8, sweeper: 10 },
    calmTimer: 0,
    hintTimer: 0,
    shake: 0,
    novaCooldown: 0,
    stars: makeStars(rng),
    stats: { novaUsed: 0, cleared: 0, hitsTaken: 0, maxCombo: 0 },
    overAt: 0,
  };
  // A few embers drift behind the title screen so it is alive, not static.
  for (let i = 0; i < 7; i += 1) {
    spawnEmber(state);
    const e = state.embersList[state.embersList.length - 1];
    e.y = range(rng, 40, FIELD.height - 60);
  }
  return state;
}

export function resetWorld(state, seed) {
  const fresh = createWorld(seed === undefined ? state.seed : seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

export function startGame(state, audio) {
  resetWorld(state, state.seed);
  state.screen = 'playing';
  state.hintTimer = 6;
  if (audio) audio.click();
}

export function fireNova(state, audio) {
  if (state.core < NOVA.cost || state.novaCooldown > 0) return false;
  state.core -= NOVA.cost;
  state.novaCooldown = NOVA.cooldownSeconds;
  state.stats.novaUsed += 1;
  const ship = state.ship;
  burstNova(state, ship.x, ship.y, NOVA.radius);
  if (audio) audio.nova();
  let cleared = 0;
  for (let i = state.hazards.length - 1; i >= 0; i -= 1) {
    const h = state.hazards[i];
    const dist = Math.hypot(h.x - ship.x, h.y - ship.y);
    if (dist < NOVA.radius + h.r) {
      if (h.kind === 'splitter') spawnSmallRocks(state, h.x, h.y);
      state.hazards.splice(i, 1);
      cleared += 1;
      spawnParticle(state, h.x, h.y, { count: 8, color: '#7ef9ff', speed: 200, size: 3, life: 0.5 });
    }
  }
  if (cleared > 0) {
    const gained = cleared * NOVA.clearScore;
    state.score += gained;
    state.stats.cleared += cleared;
    spawnFloater(state, ship.x, ship.y - 34, `NOVA +${gained}`, '#7ef9ff');
  }
  state.shake = Math.max(state.shake, 6);
  return true;
}

function collectEmber(state, audio, ember) {
  state.embers += 1;
  state.combo = Math.min(state.combo + 1, EMBER.comboMax);
  state.comboTimer = EMBER.comboWindowSeconds;
  state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
  const multiplier = 1 + (state.combo - 1) * EMBER.comboStep;
  const gained = Math.round(EMBER.baseScore * multiplier);
  state.score += gained;
  state.core = Math.min(100, state.core + EMBER.corePerPickup);
  spawnFloater(state, ember.x, ember.y - 14, `+${gained}`, '#ffb347');
  burstEmber(state, ember.x, ember.y);
  if (audio) audio.collect(state.combo);
  if (state.embers >= (state.forged + 1) * FORGE_EVERY_EMBERS) forgeStar(state, audio);
}

function forgeStar(state, audio) {
  state.forged += 1;
  state.wave += 1;
  state.maxHull = Math.min(HULL.max, state.maxHull + 1);
  state.hull = Math.min(state.maxHull, state.hull + 1);
  state.score += FORGE_BONUS;
  state.calmTimer = FORGE_CALM_SECONDS;
  spawnFloater(state, FIELD.width / 2, FIELD.height * 0.4, `STAR FORGED  +${FORGE_BONUS}`, '#7dffb0');
  spawnParticle(state, state.ship.x, state.ship.y, { count: 36, color: '#7dffb0', speed: 300, size: 3.5, life: 0.9 });
  spawnParticle(state, state.ship.x, state.ship.y, { count: 20, color: '#ffb347', speed: 200, size: 3, life: 0.8 });
  if (audio) audio.forge();
}

function hitShip(state, audio, hazard) {
  if (state.ship.invulnerable > 0) return;
  state.hull -= 1;
  state.stats.hitsTaken += 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.ship.invulnerable = SHIP.invulnerableSeconds;
  state.shake = 14;
  burstHit(state, state.ship.x, state.ship.y);
  if (audio) audio.hit();
  // The hazard shatters on impact; the ship is knocked away from it.
  const dx = state.ship.x - hazard.x;
  const dy = state.ship.y - hazard.y;
  const dist = Math.hypot(dx, dy) || 1;
  state.ship.vx += (dx / dist) * 320;
  state.ship.vy += (dy / dist) * 320;
  if (state.hull <= 0) endGame(state, audio);
}

function endGame(state, audio) {
  state.screen = 'over';
  state.overAt = state.time;
  state.ship.vx = 0;
  state.ship.vy = 0;
  spawnParticle(state, state.ship.x, state.ship.y, { count: 46, color: '#4de3ff', speed: 320, size: 4, life: 1.0 });
  spawnParticle(state, state.ship.x, state.ship.y, { count: 26, color: '#ff5d5d', speed: 240, size: 3.5, life: 0.9 });
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.score);
  }
  if (audio) audio.gameOver();
}

function steerShip(state, input, dt) {
  const ship = state.ship;
  const axis = input.axis();
  let tx = 0;
  let ty = 0;
  if (axis.x !== 0 || axis.y !== 0) {
    tx = axis.x;
    ty = axis.y;
  } else if (input.mouse.seen) {
    const dx = input.mouse.x - ship.x;
    const dy = input.mouse.y - ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 12) {
      tx = dx / dist;
      ty = dy / dist;
    }
  }
  ship.vx += tx * SHIP.accel * dt;
  ship.vy += ty * SHIP.accel * dt;
  const damp = Math.max(0, 1 - SHIP.damping * dt);
  ship.vx *= damp;
  ship.vy *= damp;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
    ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
  }
  ship.x = Math.max(ship.r, Math.min(FIELD.width - ship.r, ship.x + ship.vx * dt));
  ship.y = Math.max(ship.r, Math.min(FIELD.height - ship.r, ship.y + ship.vy * dt));
  if (speed > 40) {
    const want = Math.atan2(ship.vy, ship.vx);
    let diff = want - ship.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ship.angle += diff * Math.min(1, dt * 10);
  }
  ship.trail.push({ x: ship.x, y: ship.y });
}

function spawnStep(state, dt) {
  if (state.calmTimer > 0) return;
  const t = state.spawnTimers;
  const rockInterval = Math.max(
    SPAWN.minRockInterval,
    SPAWN.rockInterval * Math.pow(SPAWN.waveIntervalFactor, state.wave - 1),
  );
  t.ember -= dt;
  if (t.ember <= 0) {
    spawnEmber(state);
    t.ember = SPAWN.emberInterval * (0.85 + state.rng() * 0.3);
  }
  t.rock -= dt;
  if (t.rock <= 0) {
    let kind = 'rock';
    const roll = state.rng();
    if (state.wave >= 4 && roll < 0.15) kind = 'splitter';
    else if (state.wave >= 2 && roll < 0.33) kind = 'chaser';
    spawnRock(state, kind);
    t.rock = rockInterval * (0.8 + state.rng() * 0.4);
  }
  if (state.wave >= 2) {
    t.chaser -= dt;
    if (t.chaser <= 0) {
      spawnRock(state, 'chaser');
      t.chaser = SPAWN.chaserInterval * (0.85 + state.rng() * 0.3);
    }
  }
  if (state.wave >= 4) {
    t.splitter -= dt;
    if (t.splitter <= 0) {
      spawnRock(state, 'splitter');
      t.splitter = SPAWN.splitterInterval * (0.85 + state.rng() * 0.3);
    }
  }
  if (state.wave >= 6) {
    t.sweeper -= dt;
    if (t.sweeper <= 0) {
      spawnRock(state, 'sweeper');
      t.sweeper = SPAWN.sweeperInterval * (0.85 + state.rng() * 0.3);
    }
  }
}

function collideStep(state, audio) {
  const ship = state.ship;
  for (let i = state.embersList.length - 1; i >= 0; i -= 1) {
    const e = state.embersList[i];
    const dist = Math.hypot(e.x - ship.x, e.y - ship.y);
    if (dist < ship.r + e.r + 6) {
      state.embersList.splice(i, 1);
      collectEmber(state, audio, e);
    }
  }
  for (let i = state.hazards.length - 1; i >= 0; i -= 1) {
    const h = state.hazards[i];
    const dist = Math.hypot(h.x - ship.x, h.y - ship.y);
    if (dist < ship.r * 0.8 + h.r * 0.85) {
      state.hazards.splice(i, 1);
      hitShip(state, audio, h);
      if (state.screen !== 'playing') return;
    }
  }
}

function toggleMute(state, audio) {
  if (!audio) return;
  audio.setMuted(!audio.muted);
}

// One fixed step. `input` is the live input object, or a stub with the same
// shape (axis, consume, consumeAny, mouse) when a screenshot scene drives it.
export function updateWorld(state, input, audio, dt) {
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.novaCooldown > 0) state.novaCooldown -= dt;

  if (state.screen === 'title') {
    // The title screen is alive: embers drift, the ship hovers, stars twinkle.
    if (state.rng() < dt * 1.4) spawnEmber(state);
    updateEntities(state, dt);
    for (const star of state.stars) star.tw += dt * 1.4;
    if (input.consumeAny(KEYS.start) || input.mouse.clicked) startGame(state, audio);
    return;
  }

  if (state.screen === 'over') {
    updateEntities(state, dt);
    for (const star of state.stars) star.tw += dt * 1.4;
    // A press can only be observed on the frame after it happened (the input
    // clears presses every frame), so any press seen here came after the
    // game-over screen appeared: restart at once, no guard window.
    if (input.consumeAny(KEYS.start) || input.mouse.clicked) {
      startGame(state, audio);
    }
    return;
  }

  if (state.screen === 'paused') {
    if (input.consumeAny(KEYS.pause) || input.consumeAny(KEYS.start) || input.mouse.clicked) {
      state.screen = 'playing';
      if (audio) audio.click();
    }
    return;
  }

  // Playing.
  if (input.consumeAny(KEYS.pause)) {
    state.screen = 'paused';
    return;
  }
  if (input.consumeAny(KEYS.mute)) toggleMute(state, audio);
  if (input.consumeAny(KEYS.nova) || input.mouse.clicked) fireNova(state, audio);

  if (state.hintTimer > 0) state.hintTimer -= dt;
  if (state.calmTimer > 0) state.calmTimer -= dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.ship.invulnerable > 0) state.ship.invulnerable -= dt;

  steerShip(state, input, dt);
  spawnStep(state, dt);
  updateEntities(state, dt);
  collideStep(state, audio);
  for (const star of state.stars) {
    star.tw += dt * 1.4;
    star.y += star.speed * dt;
    if (star.y > FIELD.height + 2) {
      star.y = -2;
      star.x = range(state.rng, 0, FIELD.width);
    }
  }
  // The ship's trail is trimmed in updateEntities; keep it fresh here.
  if (state.ship.trail.length > 0 && state.ship.trail.length > 14) {
    state.ship.trail.splice(0, state.ship.trail.length - 14);
  }
}
