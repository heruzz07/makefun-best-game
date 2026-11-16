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
  ship: '#4de3ff',
  shipDark: '#0e7d99',
  rock: '#9a8fb0',
  rockDark: '#5c5470',
  chaser: '#ff5d8f',
  splitter: '#c792ff',
  particle: '#ffd166',
  nova: '#7ef9ff',
  hudText: '#eaf2ff',
  hudDim: '#9fb2dd',
  danger: '#ff5d5d',
  good: '#7dffb0',
  panel: 'rgba(10, 16, 38, 0.82)',
  panelEdge: '#2c3d6e',
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
};

export const NOVA = {
  cost: 30,
  radius: 175,
  cooldownSeconds: 1.0,
  clearScore: 5,
};

export const HULL = { start: 3, max: 5 };

// One star forged per 100 embers banked: +1 max hull (up to HULL.max), +1 hull,
// a short calm, and a bonus. Waves get faster and meaner after each forge.
export const FORGE_EVERY_EMBERS = 100;
export const FORGE_BONUS = 250;
export const FORGE_CALM_SECONDS = 2.0;

export const SPAWN = {
  // Seconds between spawns at wave 1; each wave multiplies by waveIntervalFactor.
  emberInterval: 0.42,
  rockInterval: 1.15,
  waveIntervalFactor: 0.88,
  minRockInterval: 0.55,
  rockSpeedMin: 55,
  rockSpeedMax: 110,
  rockSpeedPerWave: 9,
  // Chasers appear from wave 2, splitters from wave 4, sweepers from wave 6.
  chaserFromWave: 2,
  splitterFromWave: 4,
  sweeperFromWave: 6,
  chaserInterval: 7.0,
  splitterInterval: 9.0,
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
};
