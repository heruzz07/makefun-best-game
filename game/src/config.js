// Emberdrift — tuning, palette and wave table. One place for every number the
// game balances on, so a play-test can retune the game by editing this file alone.

export const FIELD = { width: 1280, height: 800 };

// The logical field is 1280x800; the canvas scales it to the window.
export const PALETTE = {
  spaceTop: '#070b1d',
  spaceBottom: '#120a2e',
  starDim: '#8fa3d9',
  starBright: '#e8eeff',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  golden: '#ffd700',
  ship: '#4de3ff',
  shipDark: '#0e7d99',
  rock: '#9a8fb0',
  rockDark: '#5c5470',
  chaser: '#ff5d8f',
  splitter: '#c792ff',
  weaver: '#7dffb0',
  mine: '#ff5d5d',
  particle: '#ffd166',
  nova: '#7ef9ff',
  hudText: '#eaf2ff',
  hudDim: '#9fb2dd',
  danger: '#ff5d5d',
  good: '#7dffb0',
  panel: 'rgba(10, 16, 38, 0.82)',
  panelEdge: '#2c3d6e',
  planet: '#c98a4b',
  planetDark: '#8a5a2e',
  planetRing: '#e8c88a',
};

export const SHIP = {
  radius: 16,
  accel: 2600,
  maxSpeed: 430,
  damping: 2.6,
  invulnerableSeconds: 1.2,
  trailLength: 14,
};

export const EMBER = {
  radius: 9,
  corePerPickup: 6,
  baseScore: 10,
  comboWindowSeconds: 2.5,
  comboMax: 5,
  // Multiplier at combo c (1-based): 1 + (c - 1) * step.
  comboStep: 0.25,
  driftMin: 26,
  driftMax: 60,
  // Chance an ember spawn is golden (worth 5, +50 score) or a shield cell.
  goldenChance: 0.05,
  shieldChance: 0.025,
};

export const GOLDEN = { value: 5, score: 50, radius: 12 };

// An ember vein: a rich cluster worth diving for. It is a risk/reward beat —
// six to eight embers in one tight ring, announced when it appears, gone
// when it drifts off the bottom. The first vein arrives early so a new
// player sees the idea in their first minute.
export const VEIN = {
  embersMin: 6,
  embersMax: 8,
  radius: 52,
  firstInSeconds: 18,
  intervalSeconds: 34,
};

// A dart: a small fast comet that streaks diagonally across the field. It is
// the only hazard that comes in on a diagonal, so it reads as a new dodge
// and it punishes sitting still in a lane.
export const DART = {
  radius: 11,
  speedMin: 380,
  speedMax: 470,
  color: '#ff9d5c',
};

// Every fifth wave is ELITE: spawns come faster and rocks fly faster, and
// the banner says so. Wave 5 is the last wave before the Beacon, so the
// climax of a run is an elite wave.
export const ELITE = { everyWaves: 5, spawnFactor: 0.72, speedFactor: 1.15 };

// Freeze frames: a hit stops the world for 50 ms, a nova for 35 ms. The
// freeze is the punch — the screen shake alone was not enough.
export const HITSTOP = { hitSeconds: 0.05, novaSeconds: 0.035 };

// A combo milestone every 5: a big centre floater and a rising sound, so a
// hot streak feels like an event, not just a number.
export const COMBO_MILESTONE = 5;

// Shooting stars: background meteors, a thin streak every few seconds, for
// depth. They never touch play — they are drawn behind everything.
export const METEOR = { intervalMin: 4, intervalMax: 8, speedMin: 420, speedMax: 620 };

export const NOVA = {
  cost: 30,
  radius: 175,
  cooldownSeconds: 1.0,
  clearScore: 5,
};

// Hold Shift to burn core for speed and a bigger combo step: core is nova
// fuel, overdrive fuel and score fuel at once, so spending it is a choice.
export const OVERDRIVE = {
  drainPerSecond: 12,
  speedBoost: 1.6,
  comboStep: 0.5,
};

export const HULL = { start: 3, max: 5 };

// One star forged per 100 embers banked: a bonus, a calm, and a choice of
// three upgrades. Forge 5 stars to light the Beacon and win.
export const FORGE_EVERY_EMBERS = 100;
export const FORGE_BONUS = 250;
export const FORGE_CALM_SECONDS = 2.0;
export const WIN_STARS = 5;

// The upgrade pool. Each forge offers three at random; the player takes one.
export const UPGRADES = [
  { id: 'hull', name: 'REINFORCED HULL', desc: '+1 max hull, +1 hull', color: '#ff5d7a' },
  { id: 'nova', name: 'WIDE NOVA', desc: 'Nova blast radius +45%', color: '#7ef9ff' },
  { id: 'magnet', name: 'MAGNET COIL', desc: 'Embers within 150 drift to you', color: '#ffb347' },
  { id: 'thrust', name: 'SWIFT THRUSTERS', desc: '+15% top speed', color: '#4de3ff' },
  { id: 'combo', name: 'LONG COMBO', desc: 'Combo window +1s, max combo +3', color: '#c792ff' },
  { id: 'core', name: 'CORE RESERVE', desc: 'Nova costs 20 core, cap +25', color: '#7dffb0' },
];

export const SPAWN = {
  // Seconds between spawns at wave 1; each wave multiplies by waveIntervalFactor.
  emberInterval: 0.42,
  rockInterval: 1.15,
  waveIntervalFactor: 0.88,
  minRockInterval: 0.55,
  rockSpeedMin: 55,
  rockSpeedMax: 110,
  rockSpeedPerWave: 9,
  // Chasers appear from wave 2, weavers from wave 3, splitters and mines
  // from wave 4, sweepers from wave 6, darts from wave 4.
  chaserFromWave: 2,
  weaverFromWave: 3,
  splitterFromWave: 4,
  mineFromWave: 4,
  dartFromWave: 4,
  sweeperFromWave: 6,
  chaserInterval: 7.0,
  weaverInterval: 8.0,
  splitterInterval: 9.0,
  mineInterval: 10.0,
  dartInterval: 12.0,
  sweeperInterval: 11.0,
};

export const ROCK = {
  radiusMin: 18,
  radiusMax: 42,
  smallRadius: 12,
  chaserRadius: 15,
  chaserSpeed: 95,
  chaserTurn: 1.6,
  sweeperSpeed: 330,
  weaverRadius: 17,
  weaverSpeed: 75,
  weaverAmp: 70,
  weaverFreq: 1.7,
  mineRadius: 14,
  mineTrigger: 90,
  mineFuse: 0.8,
  mineBlast: 120,
  magnetRadius: 150,
};

export const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  nova: ['Space'],
  start: ['Enter'],
  pause: ['KeyP'],
  mute: ['KeyM'],
  overdrive: ['ShiftLeft', 'ShiftRight'],
  upgrade: ['Digit1', 'Digit2', 'Digit3'],
  keepDrifting: ['KeyC'],
};
