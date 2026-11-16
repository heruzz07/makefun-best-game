// Emberdrift — everything the player sees. The world state is the only input:
// background, entities, HUD, and the title / pause / game-over screens.
// Screenshots are frames of this file, so it carries the game's look.

import { FIELD, PALETTE } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-9, -3, -6, -10, 0, -5);
  ctx.bezierCurveTo(6, -10, 9, -3, 0, 5);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, state) {
  const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.spaceTop);
  gradient.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Two faint nebulae, fixed in the sky so the field has depth.
  const nebulae = [
    { x: 240, y: 190, r: 260, color: 'rgba(64, 48, 140, 0.20)' },
    { x: 1050, y: 620, r: 300, color: 'rgba(20, 90, 110, 0.16)' },
    { x: 980, y: 150, r: 180, color: 'rgba(140, 60, 90, 0.12)' },
  ];
  for (const nebula of nebulae) {
    const g = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
    g.addColorStop(0, nebula.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
  }
  for (const star of state.stars) {
    const twinkle = 0.55 + 0.45 * Math.sin(star.tw);
    ctx.globalAlpha = twinkle * (star.layer === 0 ? 0.5 : star.layer === 1 ? 0.75 : 1);
    ctx.fillStyle = star.layer === 2 ? PALETTE.starBright : PALETTE.starDim;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawEmber(ctx, e) {
  const pulse = 1 + 0.18 * Math.sin(e.phase);
  const r = e.r * pulse;
  const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3.2);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.55)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.emberCore;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawShip(ctx, ship, time) {
  // Engine trail, newest last.
  const trail = ship.trail;
  if (trail.length > 1) {
    for (let i = 1; i < trail.length; i += 1) {
      const alpha = (i / trail.length) * 0.5;
      ctx.strokeStyle = `rgba(77, 227, 255, ${alpha})`;
      ctx.lineWidth = 2 + (i / trail.length) * 3;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  }
  const blink = ship.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Hull: a sleek dart.
  ctx.fillStyle = PALETTE.ship;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-14, -11);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.shipDark;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 11);
  ctx.closePath();
  ctx.fill();
  // Cockpit.
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Engine flame, flickering with speed.
  const speed = Math.hypot(ship.vx, ship.vy);
  const flame = 8 + Math.min(10, speed / 45) + Math.sin(time * 31) * 2;
  ctx.fillStyle = 'rgba(255, 179, 71, 0.9)';
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-14 - flame, 0);
  ctx.lineTo(-14, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawRock(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.rot || 0);
  ctx.beginPath();
  h.verts.forEach((v, i) => {
    const x = Math.cos(v.a) * v.d;
    const y = Math.sin(v.a) * v.d;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = h.kind === 'splitter' ? '#6b4d8f' : PALETTE.rockDark;
  ctx.fill();
  ctx.strokeStyle = PALETTE.rock;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (h.kind === 'splitter') {
    ctx.fillStyle = PALETTE.splitter;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChaser(ctx, h, time) {
  const pulse = 1 + 0.16 * Math.sin(h.pulse);
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.strokeStyle = 'rgba(255, 93, 143, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, h.r * 1.7 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.chaser;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + time * 0.8;
    const r = i % 2 === 0 ? h.r : h.r * 0.55;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd7e4';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEntities(ctx, state) {
  for (const e of state.embersList) drawEmber(ctx, e);
  for (const h of state.hazards) {
    if (h.kind === 'chaser') drawChaser(ctx, h, state.time);
    else drawRock(ctx, h);
  }
  // The ship flies only while playing (or paused): on the title screen it
  // would sit behind the panel text, and on the game-over screen it is gone.
  if (state.screen === 'playing' || state.screen === 'paused') drawShip(ctx, state.ship, state.time);
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (state.novaRing) {
    const ring = state.novaRing;
    ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife) * 0.9;
    ctx.strokeStyle = PALETTE.nova;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = '700 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state) {
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('SCORE', 28, 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 32px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(state.score), 28, 66);
  ctx.font = '600 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`WAVE ${state.wave}   •   EMBERS ${state.embers}`, 28, 100);
  if (state.combo > 1) {
    const width = 120;
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, 28, 126);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.25)';
    ctx.fillRect(28, 134, width, 5);
    ctx.fillStyle = PALETTE.ember;
    ctx.fillRect(28, 134, width * Math.max(0, state.comboTimer / 2.5), 5);
  }

  // Core bar, top centre: charge is score fuel and nova fuel at once.
  const barWidth = 300;
  const barX = FIELD.width / 2 - barWidth / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CORE', FIELD.width / 2, 34);
  ctx.fillStyle = 'rgba(234, 242, 255, 0.14)';
  roundRect(ctx, barX, 42, barWidth, 14, 7);
  ctx.fill();
  const ready = state.core >= 30;
  ctx.fillStyle = ready ? PALETTE.nova : PALETTE.ember;
  if (state.core > 0) {
    roundRect(ctx, barX, 42, Math.max(14, (barWidth * state.core) / 100), 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, 42, barWidth, 14, 7);
  ctx.stroke();
  ctx.fillStyle = ready ? PALETTE.nova : PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(ready ? 'NOVA READY — SPACE or CLICK' : `NOVA AT ${30} CORE`, FIELD.width / 2, 76);

  // Hull hearts, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HULL', FIELD.width - 28, 34);
  for (let i = 0; i < state.maxHull; i += 1) {
    const x = FIELD.width - 40 - i * 30;
    drawHeart(ctx, x, 58, 22, i < state.hull ? '#ff5d7a' : 'rgba(234, 242, 255, 0.16)');
  }

  if (state.hintTimer > 0 && state.screen === 'playing') {
    ctx.globalAlpha = Math.min(1, state.hintTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Move: mouse or WASD / arrows   •   Nova: SPACE or click   •   P: pause   •   M: mute', FIELD.width / 2, FIELD.height - 26);
    ctx.globalAlpha = 1;
  }
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 29, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const cx = FIELD.width / 2;
  const titleGradient = ctx.createLinearGradient(cx - 260, 0, cx + 260, 0);
  titleGradient.addColorStop(0, PALETTE.ship);
  titleGradient.addColorStop(0.55, '#eafcff');
  titleGradient.addColorStop(1, PALETTE.ember);
  ctx.fillStyle = titleGradient;
  ctx.font = '800 92px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('EMBERDRIFT', cx, 218);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Forge a star from the dark.', cx, 262);

  drawPanel(ctx, cx - 330, 300, 660, 252);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', cx, 336);
  ctx.font = '400 17px "Segoe UI", system-ui, sans-serif';
  const lines = [
    'Collect glowing embers to charge your core —',
    'core is your score multiplier and your nova fuel.',
    'Spend 30 core on a nova blast to clear the rocks,',
    'or hoard it and let your combo pay. Every 100',
    'embers forges a star: a new wave, +1 hull.',
    '',
    'Move: mouse or WASD / arrows      Nova: SPACE or click',
    'Pause: P      Mute: M',
  ];
  lines.forEach((line, i) => {
    if (line !== '') ctx.fillText(line, cx, 366 + i * 24);
  });
  if (state.best > 0) {
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST  ${state.best}`, cx, 592);
  }
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.good;
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', cx, 636);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '400 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('An original game  •  keyboard + mouse  •  your best score is saved on this machine', cx, 668);
  ctx.restore();
}

function drawOver(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 29, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const cx = FIELD.width / 2;
  ctx.fillStyle = '#ff8fa3';
  ctx.font = '800 64px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('SIGNAL LOST', cx, 226);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('The drift claims another skiff.', cx, 264);

  drawPanel(ctx, cx - 280, 300, 560, 218);
  const rows = [
    ['SCORE', String(state.score)],
    ['BEST', String(state.best)],
    ['EMBERS', String(state.embers)],
    ['WAVE REACHED', String(state.wave)],
    ['BEST COMBO', `x${Math.max(1, state.stats.maxCombo)}`],
  ];
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 340 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(label, cx - 240, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(value, cx + 240, y);
  });
  if (state.score > 0 && state.score >= state.best) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('★ NEW BEST ★', cx, 556);
  }
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.good;
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY AGAIN', cx, 606);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 29, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 8);
  ctx.font = '400 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('P or click to resume', FIELD.width / 2, FIELD.height / 2 + 34);
  ctx.restore();
}

export function drawWorld(ctx, state) {
  ctx.save();
  if (state.shake > 0.2) {
    const sx = Math.sin(state.time * 91) * state.shake * 0.6;
    const sy = Math.cos(state.time * 113) * state.shake * 0.6;
    ctx.translate(sx, sy);
  }
  drawBackground(ctx, state);
  drawEntities(ctx, state);
  if (state.screen === 'playing' || state.screen === 'paused') drawHud(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'over') drawOver(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  ctx.restore();
}
