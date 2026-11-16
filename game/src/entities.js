// Emberdrift — the things that fly: the ship, embers, hazards, particles and
// floating score text. Spawning and movement live here; collisions and scoring
// live in world.js, drawing in render.js.

import { EMBER, FIELD, ROCK, SHIP, SPAWN } from './config.js';
import { chance, pick, range } from './random.js';

export function makeShip() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height * 0.72,
    vx: 0,
    vy: 0,
    r: SHIP.radius,
    angle: -Math.PI / 2,
    invulnerable: 0,
    trail: [],
  };
}

function rockVertices(rng, radius) {
  const count = 7 + Math.floor(rng() * 3);
  const verts = [];
  for (let i = 0; i < count; i += 1) {
    verts.push({ a: (i / count) * Math.PI * 2, d: radius * range(rng, 0.72, 1.08) });
  }
  return verts;
}

export function spawnEmber(state) {
  const { rng } = state;
  state.embersList.push({
    kind: 'ember',
    x: range(rng, 30, FIELD.width - 30),
    y: -20,
    vx: range(rng, -14, 14),
    vy: range(rng, EMBER.driftMin, EMBER.driftMax),
    r: EMBER.radius,
    phase: rng() * Math.PI * 2,
  });
}

export function spawnRock(state, kind = 'rock') {
  const { rng } = state;
  const wave = state.wave;
  const speed = range(rng, SPAWN.rockSpeedMin, SPAWN.rockSpeedMax)
    + (wave - 1) * SPAWN.rockSpeedPerWave;
  if (kind === 'sweeper') {
    const fromLeft = chance(rng, 0.5);
    const r = range(rng, ROCK.radiusMin, ROCK.radiusMin + 10);
    state.hazards.push({
      kind: 'sweeper',
      x: fromLeft ? -r - 10 : FIELD.width + r + 10,
      y: range(rng, 90, FIELD.height - 120),
      vx: (fromLeft ? 1 : -1) * ROCK.sweeperSpeed * range(rng, 0.9, 1.15),
      vy: 0,
      r,
      rot: rng() * Math.PI * 2,
      rotSpeed: range(rng, -2.4, 2.4),
      verts: rockVertices(rng, r),
    });
    return;
  }
  if (kind === 'chaser') {
    state.hazards.push({
      kind: 'chaser',
      x: pick(rng, [range(rng, 40, 200), range(rng, FIELD.width - 200, FIELD.width - 40)]),
      y: -30,
      vx: 0,
      vy: range(rng, 40, 70),
      r: ROCK.chaserRadius,
      pulse: rng() * Math.PI * 2,
    });
    return;
  }
  const radius = kind === 'splitter'
    ? range(rng, 30, 38)
    : range(rng, ROCK.radiusMin, ROCK.radiusMax);
  state.hazards.push({
    kind,
    x: range(rng, radius, FIELD.width - radius),
    y: -radius - 10,
    vx: range(rng, -24, 24),
    vy: speed * range(rng, 0.8, 1.25),
    r: radius,
    rot: rng() * Math.PI * 2,
    rotSpeed: range(rng, -1.6, 1.6),
    verts: rockVertices(rng, radius),
  });
}

export function spawnSmallRocks(state, x, y) {
  const { rng } = state;
  for (let i = 0; i < 2; i += 1) {
    const angle = range(rng, 0, Math.PI * 2);
    state.hazards.push({
      kind: 'small',
      x,
      y,
      vx: Math.cos(angle) * range(rng, 90, 170),
      vy: range(rng, 60, 140),
      r: ROCK.smallRadius,
      rot: rng() * Math.PI * 2,
      rotSpeed: range(rng, -3, 3),
      verts: rockVertices(rng, ROCK.smallRadius),
    });
  }
}

export function spawnParticle(state, x, y, { count = 10, color = '#ffd166', speed = 160, size = 3, life = 0.6 } = {}) {
  const { rng } = state;
  for (let i = 0; i < count; i += 1) {
    const angle = range(rng, 0, Math.PI * 2);
    const v = range(rng, speed * 0.3, speed);
    state.particles.push({
      kind: 'particle',
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: range(rng, life * 0.6, life),
      maxLife: life,
      size: range(rng, size * 0.6, size * 1.4),
      color,
    });
  }
}

export function spawnFloater(state, x, y, text, color = '#eaf2ff') {
  state.floaters.push({ kind: 'floater', x, y, text, color, life: 1.1, maxLife: 1.1 });
}

export function burstEmber(state, x, y) {
  spawnParticle(state, x, y, { count: 12, color: '#ffb347', speed: 190, size: 3.5, life: 0.55 });
  spawnParticle(state, x, y, { count: 5, color: '#fff3c4', speed: 90, size: 2.5, life: 0.4 });
}

export function burstHit(state, x, y) {
  spawnParticle(state, x, y, { count: 22, color: '#ff5d5d', speed: 260, size: 4, life: 0.7 });
  spawnParticle(state, x, y, { count: 10, color: '#4de3ff', speed: 180, size: 3, life: 0.6 });
}

export function burstNova(state, x, y, radius) {
  spawnParticle(state, x, y, { count: 40, color: '#7ef9ff', speed: 420, size: 3.5, life: 0.8 });
  spawnParticle(state, x, y, { count: 16, color: '#ffffff', speed: 260, size: 2.5, life: 0.5 });
  state.novaRing = { x, y, r: 12, maxR: radius, life: 0.45, maxLife: 0.45 };
}

function outOfField(e, margin = 80) {
  return e.x < -margin || e.x > FIELD.width + margin || e.y < -margin || e.y > FIELD.height + margin;
}

export function updateEntities(state, dt) {
  const ship = state.ship;
  for (let i = state.embersList.length - 1; i >= 0; i -= 1) {
    const e = state.embersList[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.phase += dt * 3;
    if (e.y > FIELD.height + 40) state.embersList.splice(i, 1);
  }
  for (let i = state.hazards.length - 1; i >= 0; i -= 1) {
    const h = state.hazards[i];
    if (h.kind === 'chaser') {
      const dx = ship.x - h.x;
      const dy = ship.y - h.y;
      const dist = Math.hypot(dx, dy) || 1;
      const want = Math.atan2(dy, dx);
      const have = Math.atan2(h.vy, h.vx || 0.001);
      let turn = want - have;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      const next = have + Math.max(-ROCK.chaserTurn * dt, Math.min(ROCK.chaserTurn * dt, turn));
      const speed = Math.min(ROCK.chaserSpeed + state.wave * 6, 190);
      h.vx = Math.cos(next) * speed;
      h.vy = Math.sin(next) * speed;
      h.pulse += dt * 6;
    }
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    if (h.rot !== undefined) h.rot += h.rotSpeed * dt;
    if (outOfField(h, 120)) state.hazards.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y -= 42 * dt;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  if (state.novaRing) {
    const ring = state.novaRing;
    ring.life -= dt;
    ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 9);
    if (ring.life <= 0) state.novaRing = null;
  }
  if (ship.trail.length > SHIP.trailLength) ship.trail.shift();
}
