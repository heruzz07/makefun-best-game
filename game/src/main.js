// Emberdrift — boot and the main loop. Fixed-step simulation (60 Hz) with a
// render each animation frame; the logical field is 1280x800 and scales to
// the window. ?shot=start|play|end|nova&seed=N stages one deterministic
// screenshot scene instead of looping, for the screenshots/ folder.

import { FIELD } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { drawWorld } from './render.js';
import { stageShot } from './shots.js';
import { createWorld, updateWorld } from './world.js';
import { hashSeed } from './random.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const seed = seedParam === null ? (Date.now() % 2147483647) : (Number.parseInt(seedParam, 10) || hashSeed(seedParam));
const shot = params.get('shot');

const world = createWorld(seed);
const audio = createAudio();
window.addEventListener('pointerdown', () => audio.ensure());
window.addEventListener('keydown', () => audio.ensure());

let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const scale = Math.min(w / FIELD.width, h / FIELD.height);
  view = {
    scale,
    ox: (w - FIELD.width * scale) / 2,
    oy: (h - FIELD.height * scale) / 2,
    dpr,
  };
}

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.ox) / view.scale,
    y: (clientY - rect.top - view.oy) / view.scale,
  };
}

const input = createInput(canvas, toLogical);
window.addEventListener('resize', resize);
resize();

function drawFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#070b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
  drawWorld(ctx, world);
}

function describeScreen() {
  if (world.screen === 'playing') return `Playing Emberdrift — score ${world.score}, wave ${world.wave}, hull ${world.hull}.`;
  if (world.screen === 'over') return `Game over — score ${world.score}, best ${world.best}. Press Enter to fly again.`;
  if (world.screen === 'paused') return 'Paused.';
  return 'Emberdrift title screen. Press Enter or click to fly.';
}

let lastScreen = '';
function announce() {
  if (world.screen !== lastScreen) {
    lastScreen = world.screen;
    if (statusLine) statusLine.textContent = describeScreen();
  }
}

// A handle for play-testing from the console and the screenshot driver.
window.__emberdrift = { world, input, audio };

if (shot !== null) {
  const staged = stageShot(shot, world);
  drawFrame();
  announce();
  document.title = `Emberdrift — ${staged.screen} (shot ${shot}, seed ${seed})`;
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    // Snapshot the edge-triggered presses and click BEFORE the world reads
    // them. A press that arrives during this frame (while drawing, which is
    // the slow part on a weak machine) must survive to the next frame, not
    // be wiped by the end-of-frame clear before the world ever sees it.
    const pendingPresses = new Set(input.pressed);
    const clickedAtStart = input.mouse.clicked;
    let steps = 0;
    while (accumulator >= STEP && steps < 4) {
      updateWorld(world, input, audio, STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 4) accumulator = 0;
    // Clear only what was pending when the frame started (and not already
    // consumed): anything pressed during the frame stays for the next one.
    // And only clear when the world actually stepped: a press that arrives
    // in a frame where the world did not step must survive to the next
    // frame, or inputs get dropped whenever the display runs faster than
    // the 60 Hz simulation (a real bug — a keypress could vanish).
    if (steps > 0) {
      for (const code of pendingPresses) input.pressed.delete(code);
      if (clickedAtStart) input.mouse.clicked = false;
    }
    drawFrame();
    announce();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
