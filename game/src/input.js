// Emberdrift — keyboard and mouse, kept in one place. The game reads movement
// as an axis and actions as edge-triggered presses, so the loop never sees raw
// DOM events. Arrow keys and Space never scroll the page while playing.

import { KEYS } from './config.js';

const GAME_CODES = new Set([
  ...KEYS.left, ...KEYS.right, ...KEYS.up, ...KEYS.down,
  ...KEYS.nova, ...KEYS.start, ...KEYS.pause, ...KEYS.mute,
]);

export function createInput(canvas, toLogical) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false, seen: false },

    axis() {
      const left = KEYS.left.some((code) => this.keys.has(code));
      const right = KEYS.right.some((code) => this.keys.has(code));
      const up = KEYS.up.some((code) => this.keys.has(code));
      const down = KEYS.down.some((code) => this.keys.has(code));
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },

    consume(code) {
      if (this.pressed.has(code)) {
        this.pressed.delete(code);
        return true;
      }
      return false;
    },

    consumeAny(codes) {
      return codes.some((code) => this.consume(code));
    },

    // Call once per frame, after the world has read the presses.
    endFrame() {
      this.pressed.clear();
      this.mouse.clicked = false;
    },
  };

  window.addEventListener('keydown', (event) => {
    if (GAME_CODES.has(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });

  const track = (event) => {
    const point = toLogical(event.clientX, event.clientY);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.seen = true;
  };
  canvas.addEventListener('mousemove', track);
  canvas.addEventListener('mousedown', (event) => {
    track(event);
    input.mouse.down = true;
    input.mouse.clicked = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });
  canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      const point = toLogical(touch.clientX, touch.clientY);
      input.mouse.x = point.x;
      input.mouse.y = point.y;
      input.mouse.seen = true;
      // Touch drag steers; it never fires a nova (a tap is not a click here).
      input.mouse.down = true;
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) track(touch);
  }, { passive: false });
  canvas.addEventListener('touchend', (event) => {
    event.preventDefault();
    input.mouse.down = false;
  }, { passive: false });

  return input;
}
