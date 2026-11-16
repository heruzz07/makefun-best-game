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
  // A few spawns are golden (worth 5 embers, +50 score) or a shield cell
  // (one free hit). Both are rarer than a plain ember, and both are worth
  // flying out of the way for.
  const roll = rng();
  let kind = 'ember';
  let radius = EMBER.radius;
  if (roll < EMBER.goldenChance) {
    kind = 'golden';
    radius = 12;
  } else if (roll < EMBER.goldenChance + EMBER.shieldChance) {
    kind = 'shield';
    radius = 11;
  }
  state.embersList.push({
    kind,
    x: range(rng, 30, FIELD.width - 30),
    y: -20,
    vx: range(rng, -14, 14),
    vy: range(rng, EMBER.driftMin, EMBER.driftMax),
    r: radius,
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
  if (kind === 'weaver') {
    // A rock that weaves across its lane in a sine wave: it blocks a wide
    // corridor, but its path is readable, so it can be flown around.
    const baseX = range(rng, 120, FIELD.width - 120);
    state.hazards.push({
      kind: 'weaver',
      x: baseX,
      baseX,
      y: -30,
      vx: 0,
      vy: ROCK.weaverSpeed * range(rng, 0.85, 1.2),
      r: ROCK.weaverRadius,
      rot: rng() * Math.PI * 2,
      rotSpeed: range(rng, -1.2, 1.2),
      verts: rockVertices(rng, ROCK.weaverRadius),
      phase: rng() * Math.PI * 2,
      age: 0,
    });
    return;
  }
  if (kind === 'mine') {
    // A proximity mine: it drifts down slowly, arms when the ship comes
    // close, then detonates after a short fuse. The blast clears rocks too.
    state.hazards.push({
      kind: 'mine',
      x: range(rng, 60, FIELD.width - 60),
      y: -30,
      vx: range(rng, -8, 8),
      vy: range(rng, 30, 48),
      r: ROCK.mineRadius,
      rot: rng() * Math.PI * 2,
      rotSpeed: range(rng, -1, 1),
      armed: 0,
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

export function burstGolden(state, x, y) {
  spawnParticle(state, x, y, { count: 22, color: '#ffd700', speed: 260, size: 4, life: 0.7 });
  spawnParticle(state, x, y, { count: 10, color: '#fff3c4', speed: 140, size: 3, life: 0.5 });
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

export function burstMine(state, x, y) {
  spawnParticle(state, x, y, { count: 30, color: '#ff5d5d', speed: 380, size: 4, life: 0.7 });
  spawnParticle(state, x, y, { count: 14, color: '#ffb347', speed: 240, size: 3, life: 0.55 });
  spawnParticle(state, x, y, { count: 8, color: '#ffffff', speed: 160, size: 2.5, life: 0.4 });
  // The blast clears nearby rocks on its first update (see updateEntities):
  // clearing them here, inside the hazards loop, would corrupt its index.
  state.blasts.push({ x, y, r: 10, maxR: ROCK.mineBlast, life: 0.4, maxLife: 0.4, hitDone: false, cleared: false });
  state.shake = Math.max(state.shake, 10);
}

function outOfField(e, margin = 80) {
  return e.x < -margin || e.x > FIELD.width + margin || e.y < -margin || e.y > FIELD.height + margin;
}

export function updateEntities(state, dt) {
  const ship = state.ship;
  const magnet = state.upg && state.upg.magnet;
  for (let i = state.embersList.length - 1; i >= 0; i -= 1) {
    const e = state.embersList[i];
    if (magnet) {
      const dx = ship.x - e.x;
      const dy = ship.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist < ROCK.magnetRadius && dist > 1) {
        e.vx += (dx / dist) * 520 * dt;
        e.vy += (dy / dist) * 520 * dt;
      }
    }
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
    } else if (h.kind === 'weaver') {
      h.age += dt;
      // The x comes from the sine; the common step below moves y.
      h.x = h.baseX + Math.sin(h.age * ROCK.weaverFreq + h.phase) * ROCK.weaverAmp;
    } else if (h.kind === 'mine') {
      h.pulse += dt * 5;
      const dist = Math.hypot(ship.x - h.x, ship.y - h.y);
      if (h.armed === 0 && dist < ROCK.mineTrigger && state.screen === 'playing') {
        h.armed = ROCK.mineFuse;
      }
      if (h.armed > 0) {
        h.armed -= dt;
        if (h.armed <= 0) {
          // Detonate and remove only this mine; the blast clears rocks
          // on its own first update, outside this loop.
          burstMine(state, h.x, h.y);
          state.hazards.splice(i, 1);
          continue;
        }
      }
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
  for (let i = state.blasts.length - 1; i >= 0; i -= 1) {
    const b = state.blasts[i];
    if (!b.cleared) {
      // First update: the blast clears the rocks caught in it.
      b.cleared = true;
      for (let j = state.hazards.length - 1; j >= 0; j -= 1) {
        const other = state.hazards[j];
        if (Math.hypot(other.x - b.x, other.y - b.y) < b.maxR) {
          if (other.kind === 'splitter') spawnSmallRocks(state, other.x, other.y);
          state.hazards.splice(j, 1);
          spawnParticle(state, other.x, other.y, { count: 6, color: '#9a8fb0', speed: 150, size: 3, life: 0.4 });
        }
      }
    }
    b.life -= dt;
    b.r += (b.maxR - b.r) * Math.min(1, dt * 12);
    if (b.life <= 0) state.blasts.splice(i, 1);
  }
  if (state.novaRing) {
    const ring = state.novaRing;
    ring.life -= dt;
    ring.r += (ring.maxR - ring.r) * Math.min(1, dt * 9);
    if (ring.life <= 0) state.novaRing = null;
  }
  if (ship.trail.length > SHIP.trailLength) ship.trail.shift();
}
