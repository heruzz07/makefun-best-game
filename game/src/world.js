// Emberdrift — the game itself: screens, scoring, waves, collisions, the nova.
// The state machine is title -> playing -> over, with pause and an upgrade
// choice inside playing, and a win screen once the Beacon is lit.
// Everything the render loop draws comes from this state, and nothing else.

import {
  COMBO_MILESTONE, DART, ELITE, EMBER, FIELD, FORGE_BONUS, FORGE_CALM_SECONDS,
  FORGE_EVERY_EMBERS, GOLDEN, HITSTOP, HULL, KEYS, METEOR, NOVA, OVERDRIVE,
  SHIP, SPAWN, UPGRADES, VEIN, WIN_STARS,
} from './config.js';
import {
  burstEmber, burstGolden, burstHit, burstNova, makeShip, spawnEmber,
  spawnEmberVein, spawnFloater, spawnMeteor, spawnParticle, spawnRock,
  spawnSmallRocks, updateEntities,
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
    blasts: [],
    veins: [],
    meteors: [],
    novaRing: null,
    spawnTimers: { ember: 0.4, rock: 1.2, chaser: 6, weaver: 7, splitter: 8, mine: 9, dart: 11, sweeper: 10 },
    veinTimer: VEIN.firstInSeconds,
    meteorTimer: 4,
    hitStop: 0,
    elite: false,
    calmTimer: 0,
    hintTimer: 0,
    shake: 0,
    hitFlash: 0,
    novaCooldown: 0,
    overdrive: false,
    shield: false,
    storm: 0,
    banner: null,
    won: false,
    upgradeChoices: [],
    upgradeCards: [],
    upgradesTaken: [],
    // The upgrades this run has taken, as live numbers. A forge choice edits
    // these, so the whole build is one object the render and the loop read.
    upg: {
      novaRadius: NOVA.radius,
      magnet: false,
      speedMul: 1,
      comboWindow: EMBER.comboWindowSeconds,
      comboMax: EMBER.comboMax,
      novaCost: NOVA.cost,
      coreCap: 100,
    },
    stars: makeStars(rng),
    stats: { novaUsed: 0, cleared: 0, hitsTaken: 0, maxCombo: 0, golden: 0, upgrades: 0 },
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

function setBanner(state, text, sub, seconds = 2.2) {
  state.banner = { text, sub: sub || '', life: seconds, maxLife: seconds };
}

export function fireNova(state, audio) {
  if (state.core < state.upg.novaCost || state.novaCooldown > 0) return false;
  state.core -= state.upg.novaCost;
  state.novaCooldown = NOVA.cooldownSeconds;
  state.stats.novaUsed += 1;
  const ship = state.ship;
  const radius = state.upg.novaRadius;
  burstNova(state, ship.x, ship.y, radius);
  if (audio) audio.nova();
  let cleared = 0;
  for (let i = state.hazards.length - 1; i >= 0; i -= 1) {
    const h = state.hazards[i];
    const dist = Math.hypot(h.x - ship.x, h.y - ship.y);
    if (dist < radius + h.r) {
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
  // A nova freezes the world for a beat: the blast lands, then play resumes.
  state.hitStop = Math.max(state.hitStop, HITSTOP.novaSeconds);
  return true;
}

function collectEmber(state, audio, ember) {
  const golden = ember.kind === 'golden';
  const shieldCell = ember.kind === 'shield';
  if (shieldCell) {
    state.shield = true;
    spawnFloater(state, ember.x, ember.y - 14, 'SHIELD UP', '#7ef9ff');
    spawnParticle(state, ember.x, ember.y, { count: 14, color: '#7ef9ff', speed: 180, size: 3, life: 0.5 });
    if (audio) audio.shield();
    return;
  }
  const value = golden ? GOLDEN.value : 1;
  state.embers += value;
  state.combo = Math.min(state.combo + 1, state.upg.comboMax);
  state.comboTimer = state.upg.comboWindow;
  state.stats.maxCombo = Math.max(state.stats.maxCombo, state.combo);
  const step = state.overdrive ? OVERDRIVE.comboStep : EMBER.comboStep;
  const multiplier = 1 + (state.combo - 1) * step;
  const gained = Math.round(EMBER.baseScore * multiplier) + (golden ? GOLDEN.score : 0);
  state.score += gained;
  state.core = Math.min(state.upg.coreCap, state.core + EMBER.corePerPickup);
  // A combo milestone is an event: a big centre floater, a golden burst and
  // a rising sound, so a hot streak feels like one. Only one milestone
  // floater shows at a time — an older one is replaced, never doubled.
  if (state.combo > 0 && state.combo % COMBO_MILESTONE === 0) {
    state.floaters = state.floaters.filter((f) => !f.text.startsWith('COMBO x'));
    spawnFloater(state, FIELD.width / 2, FIELD.height * 0.3, `COMBO x${state.combo}!`, '#ffd700');
    spawnParticle(state, state.ship.x, state.ship.y, { count: 16, color: '#ffd700', speed: 240, size: 3, life: 0.6 });
    if (audio) audio.combo(state.combo);
  }
  if (golden) {
    state.stats.golden += 1;
    spawnFloater(state, ember.x, ember.y - 14, `GOLDEN +${gained}`, '#ffd700');
    burstGolden(state, ember.x, ember.y);
    if (audio) audio.golden();
  } else {
    spawnFloater(state, ember.x, ember.y - 14, `+${gained}`, '#ffb347');
    burstEmber(state, ember.x, ember.y);
    if (audio) audio.collect(state.combo);
  }
  if (state.embers >= (state.forged + 1) * FORGE_EVERY_EMBERS) forgeStar(state, audio);
}

function pickUpgrades(state) {
  const taken = state.upgradesTaken;
  const avail = UPGRADES.filter((u) => {
    if (u.id === 'magnet' && taken.includes('magnet')) return false;
    if (u.id === 'hull' && state.maxHull >= HULL.max) return false;
    return true;
  });
  const pool = avail.length >= 3 ? avail : UPGRADES;
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(state.rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, 3);
}

function applyUpgrade(state, audio, up) {
  state.upgradesTaken.push(up.id);
  state.stats.upgrades += 1;
  const u = state.upg;
  if (up.id === 'hull') {
    state.maxHull = Math.min(HULL.max, state.maxHull + 1);
    state.hull = Math.min(state.maxHull, state.hull + 1);
  } else if (up.id === 'nova') {
    u.novaRadius = Math.round(u.novaRadius * 1.45);
  } else if (up.id === 'magnet') {
    u.magnet = true;
  } else if (up.id === 'thrust') {
    u.speedMul *= 1.15;
  } else if (up.id === 'combo') {
    u.comboWindow += 1;
    u.comboMax += 3;
  } else if (up.id === 'core') {
    u.novaCost = 20;
    u.coreCap += 25;
  }
  spawnFloater(state, FIELD.width / 2, FIELD.height * 0.35, up.name, up.color);
  spawnParticle(state, state.ship.x, state.ship.y, { count: 24, color: up.color, speed: 260, size: 3.5, life: 0.8 });
  if (audio) audio.upgrade();
  state.screen = 'playing';
  state.upgradeChoices = [];
  state.upgradeCards = [];
}

function forgeStar(state, audio) {
  state.forged += 1;
  state.score += FORGE_BONUS;
  state.calmTimer = FORGE_CALM_SECONDS;
  spawnFloater(state, FIELD.width / 2, FIELD.height * 0.4, `STAR FORGED  +${FORGE_BONUS}`, '#7dffb0');
  spawnParticle(state, state.ship.x, state.ship.y, { count: 36, color: '#7dffb0', speed: 300, size: 3.5, life: 0.9 });
  spawnParticle(state, state.ship.x, state.ship.y, { count: 20, color: '#ffb347', speed: 200, size: 3, life: 0.8 });
  if (audio) audio.forge();
  // The fifth star lights the Beacon: the run is won.
  if (state.forged >= WIN_STARS && !state.won) {
    winGame(state, audio);
    return;
  }
  state.wave += 1;
  // Every fifth wave is ELITE: faster spawns, faster rocks, and a banner
  // that says so. Wave 5 is the last wave before the Beacon, so a run's
  // climax is an elite wave.
  state.elite = state.wave % ELITE.everyWaves === 0;
  setBanner(state, `WAVE ${state.wave}`, waveSubtitle(state.wave));
  if (state.elite) {
    setBanner(state, `WAVE ${state.wave} — ELITE`, 'Faster. Meaner. Richer.');
  }
  if (state.wave % 3 === 0) {
    state.storm = 5;
    setBanner(state, `WAVE ${state.wave} — EMBER STORM`, 'Rich pickings. Fly fast, fly careful.');
  }
  // A forge is a choice, not just a reward: pick one of three upgrades.
  state.upgradeChoices = pickUpgrades(state);
  state.upgradeCards = [];
  state.screen = 'upgrade';
}

function waveSubtitle(wave) {
  if (wave === 2) return 'Chasers inbound — they hunt you.';
  if (wave === 3) return 'Weavers block the lanes.';
  if (wave === 4) return 'Splitters break apart. Mines arm. Darts streak.';
  if (wave === 6) return 'Sweepers cross the field.';
  return 'Faster. Meaner. Richer.';
}

function winGame(state, audio) {
  state.screen = 'win';
  state.won = true;
  state.overAt = state.time;
  state.ship.vx = 0;
  state.ship.vy = 0;
  // Clear the floating score text so it does not print over the win panel.
  state.floaters = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    spawnParticle(state, state.ship.x + Math.cos(angle) * 90, state.ship.y + Math.sin(angle) * 90, { count: 18, color: '#ffd700', speed: 240, size: 3.5, life: 1.0 });
  }
  spawnParticle(state, state.ship.x, state.ship.y, { count: 40, color: '#7dffb0', speed: 300, size: 4, life: 1.1 });
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.score);
  }
  if (audio) audio.win();
}

function hitShip(state, audio, hazard) {
  if (state.ship.invulnerable > 0) return;
  // A shield takes the hit instead of the hull, then breaks.
  if (state.shield) {
    state.shield = false;
    state.ship.invulnerable = SHIP.invulnerableSeconds;
    state.shake = Math.max(state.shake, 10);
    state.hitFlash = 0.7;
    spawnFloater(state, state.ship.x, state.ship.y - 30, 'SHIELD DOWN', '#7ef9ff');
    spawnParticle(state, state.ship.x, state.ship.y, { count: 20, color: '#7ef9ff', speed: 260, size: 3.5, life: 0.6 });
    if (audio) audio.shieldBreak();
    return;
  }
  state.hull -= 1;
  state.stats.hitsTaken += 1;
  state.combo = 0;
  state.comboTimer = 0;
  state.ship.invulnerable = SHIP.invulnerableSeconds;
  state.shake = 14;
  state.hitFlash = 1;
  // A hit freezes the world for a beat: the impact lands, then play resumes.
  state.hitStop = Math.max(state.hitStop, HITSTOP.hitSeconds);
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
  const maxSpeed = SHIP.maxSpeed * state.upg.speedMul * (state.overdrive ? OVERDRIVE.speedBoost : 1);
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > maxSpeed) {
    ship.vx = (ship.vx / speed) * maxSpeed;
    ship.vy = (ship.vy / speed) * maxSpeed;
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
  const storm = state.storm > 0;
  // An elite wave paces everything faster.
  const pace = state.elite ? ELITE.spawnFactor : 1;
  const rockInterval = Math.max(
    SPAWN.minRockInterval,
    SPAWN.rockInterval * Math.pow(SPAWN.waveIntervalFactor, state.wave - 1),
  );
  t.ember -= dt;
  if (t.ember <= 0) {
    spawnEmber(state);
    t.ember = SPAWN.emberInterval * pace * (storm ? 0.5 : 1) * (0.85 + state.rng() * 0.3);
  }
  // An ember vein on a slow clock: a rich cluster worth diving for.
  state.veinTimer -= dt;
  if (state.veinTimer <= 0) {
    spawnEmberVein(state);
    state.veinTimer = VEIN.intervalSeconds * (0.85 + state.rng() * 0.3);
  }
  t.rock -= dt;
  if (t.rock <= 0) {
    let kind = 'rock';
    const roll = state.rng();
    if (state.wave >= 4 && roll < 0.10) kind = 'mine';
    else if (state.wave >= 3 && roll < 0.22) kind = 'weaver';
    else if (state.wave >= 4 && roll < 0.34) kind = 'splitter';
    else if (state.wave >= 2 && roll < 0.52) kind = 'chaser';
    spawnRock(state, kind);
    t.rock = rockInterval * pace * (storm ? 0.7 : 1) * (0.8 + state.rng() * 0.4);
  }
  if (state.wave >= 2) {
    t.chaser -= dt;
    if (t.chaser <= 0) {
      spawnRock(state, 'chaser');
      t.chaser = SPAWN.chaserInterval * pace * (0.85 + state.rng() * 0.3);
    }
  }
  if (state.wave >= 3) {
    t.weaver -= dt;
    if (t.weaver <= 0) {
      spawnRock(state, 'weaver');
      t.weaver = SPAWN.weaverInterval * pace * (0.85 + state.rng() * 0.3);
    }
  }
  if (state.wave >= 4) {
    t.splitter -= dt;
    if (t.splitter <= 0) {
      spawnRock(state, 'splitter');
      t.splitter = SPAWN.splitterInterval * pace * (0.85 + state.rng() * 0.3);
    }
    t.mine -= dt;
    if (t.mine <= 0) {
      spawnRock(state, 'mine');
      t.mine = SPAWN.mineInterval * pace * (0.85 + state.rng() * 0.3);
    }
    t.dart -= dt;
    if (t.dart <= 0) {
      spawnRock(state, 'dart');
      t.dart = SPAWN.dartInterval * pace * (0.85 + state.rng() * 0.3);
    }
  }
  if (state.wave >= 6) {
    t.sweeper -= dt;
    if (t.sweeper <= 0) {
      spawnRock(state, 'sweeper');
      t.sweeper = SPAWN.sweeperInterval * pace * (0.85 + state.rng() * 0.3);
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
      // A forge can end the run (win) or open the upgrade screen.
      if (state.screen !== 'playing') return;
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
  // A mine blast hurts once, while it is still expanding.
  for (const b of state.blasts) {
    if (!b.hitDone && Math.hypot(ship.x - b.x, ship.y - b.y) < b.r + ship.r * 0.5) {
      b.hitDone = true;
      hitShip(state, audio, { x: b.x, y: b.y });
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
  // Hit-stop: a hit or a nova freezes the world for a beat. The freeze is
  // the punch — the timer ticks down and nothing else moves.
  if (state.hitStop > 0) {
    state.hitStop -= dt;
    return;
  }
  state.time += dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
  if (state.hitFlash > 0) state.hitFlash = Math.max(0, state.hitFlash - dt * 1.8);
  if (state.novaCooldown > 0) state.novaCooldown -= dt;
  if (state.banner) {
    state.banner.life -= dt;
    if (state.banner.life <= 0) state.banner = null;
  }

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

  if (state.screen === 'win') {
    updateEntities(state, dt);
    for (const star of state.stars) star.tw += dt * 1.4;
    // C keeps drifting in the same run (endless now, the Beacon stays lit);
    // Enter or a click flies a fresh run.
    if (input.consumeAny(KEYS.keepDrifting)) {
      state.screen = 'playing';
      if (audio) audio.click();
    } else if (input.consumeAny(KEYS.start) || input.mouse.clicked) {
      startGame(state, audio);
    }
    return;
  }

  if (state.screen === 'upgrade') {
    // The field drifts behind the choice, but nothing can hit the ship.
    updateEntities(state, dt);
    for (const star of state.stars) star.tw += dt * 1.4;
    for (let i = 0; i < state.upgradeChoices.length; i += 1) {
      if (input.consume(KEYS.upgrade[i])) {
        applyUpgrade(state, audio, state.upgradeChoices[i]);
        return;
      }
    }
    if (input.consumeAny(KEYS.start) && state.upgradeChoices.length > 0) {
      applyUpgrade(state, audio, state.upgradeChoices[0]);
      return;
    }
    if (input.mouse.clicked) {
      const m = input.mouse;
      for (let i = 0; i < state.upgradeCards.length; i += 1) {
        const c = state.upgradeCards[i];
        if (m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h) {
          applyUpgrade(state, audio, state.upgradeChoices[i]);
          return;
        }
      }
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

  // Overdrive: hold Shift to burn core for speed and a bigger combo step.
  const shiftHeld = input.keys && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'));
  state.overdrive = Boolean(shiftHeld) && state.core > 0;
  if (state.overdrive) {
    state.core = Math.max(0, state.core - OVERDRIVE.drainPerSecond * dt);
  }

  if (state.hintTimer > 0) state.hintTimer -= dt;
  if (state.calmTimer > 0) state.calmTimer -= dt;
  if (state.storm > 0) state.storm -= dt;
  // Shooting stars: a background streak every few seconds, for depth.
  state.meteorTimer -= dt;
  if (state.meteorTimer <= 0) {
    spawnMeteor(state);
    state.meteorTimer = range(state.rng, METEOR.intervalMin, METEOR.intervalMax);
  }
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
