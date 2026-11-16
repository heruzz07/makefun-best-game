// Emberdrift — everything the player sees. The world state is the only input:
// background, entities, HUD, and the title / pause / game-over / win screens.
// Screenshots are frames of this file, so it carries the game's look.

import { FIELD, PALETTE, WIN_STARS } from './config.js';

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

function drawStarIcon(ctx, x, y, r, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 === 0 ? r : r * 0.45;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
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
  // A ringed gas giant looms over the drift: the field has a place now, not
  // just a colour. It sits half out of the corner so it never crowds play.
  const px = 1090;
  const py = 96;
  const pr = 108;
  const pg = ctx.createRadialGradient(px - 30, py - 30, 10, px, py, pr);
  pg.addColorStop(0, '#e8b877');
  pg.addColorStop(0.55, PALETTE.planet);
  pg.addColorStop(1, PALETTE.planetDark);
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(138, 90, 46, 0.55)';
  ctx.beginPath();
  ctx.ellipse(px, py + 34, pr * 0.92, pr * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.32);
  ctx.strokeStyle = 'rgba(232, 200, 138, 0.75)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, pr * 1.55, pr * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 200, 138, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Nebulae: warm ember clouds low, cool gas high, so the field has depth.
  const nebulae = [
    { x: 240, y: 190, r: 260, color: 'rgba(64, 48, 140, 0.20)' },
    { x: 1050, y: 620, r: 300, color: 'rgba(20, 90, 110, 0.16)' },
    { x: 980, y: 150, r: 180, color: 'rgba(140, 60, 90, 0.12)' },
    { x: 180, y: 640, r: 240, color: 'rgba(160, 90, 30, 0.13)' },
    { x: 620, y: 420, r: 200, color: 'rgba(90, 40, 120, 0.10)' },
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
  const isGolden = e.kind === 'golden';
  const isShield = e.kind === 'shield';
  const glowColor = isGolden ? '255, 215, 0' : isShield ? '126, 249, 255' : '255, 179, 71';
  const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3.4);
  glow.addColorStop(0, `rgba(${glowColor}, 0.6)`);
  glow.addColorStop(1, `rgba(${glowColor}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();
  // A diamond flame, not a dot: it reads as something to chase.
  ctx.fillStyle = isGolden ? PALETTE.golden : isShield ? PALETTE.nova : PALETTE.ember;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y - r * 1.25);
  ctx.lineTo(e.x + r * 0.8, e.y);
  ctx.lineTo(e.x, e.y + r * 1.25);
  ctx.lineTo(e.x - r * 0.8, e.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.emberCore;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  if (isGolden) {
    // A sparkle cross so a golden ember reads as rare at a glance.
    ctx.strokeStyle = 'rgba(255, 243, 196, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - r * 1.7, e.y);
    ctx.lineTo(e.x - r * 0.9, e.y);
    ctx.moveTo(e.x + r * 0.9, e.y);
    ctx.lineTo(e.x + r * 1.7, e.y);
    ctx.moveTo(e.x, e.y - r * 1.7);
    ctx.lineTo(e.x, e.y - r * 0.9);
    ctx.moveTo(e.x, e.y + r * 0.9);
    ctx.lineTo(e.x, e.y + r * 1.7);
    ctx.stroke();
  }
  if (isShield) {
    ctx.strokeStyle = 'rgba(126, 249, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r * 1.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawShip(ctx, ship, time, state) {
  // Engine glow, brighter when the ship is fast or overdriving.
  const speed = Math.hypot(ship.vx, ship.vy);
  const over = state.overdrive;
  const glowR = 30 + Math.min(18, speed / 24) + (over ? 14 : 0);
  const glow = ctx.createRadialGradient(ship.x, ship.y, 0, ship.x, ship.y, glowR);
  glow.addColorStop(0, over ? 'rgba(255, 140, 60, 0.35)' : 'rgba(77, 227, 255, 0.28)');
  glow.addColorStop(1, 'rgba(77, 227, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, glowR, 0, Math.PI * 2);
  ctx.fill();
  // Engine trail, newest last.
  const trail = ship.trail;
  if (trail.length > 1) {
    for (let i = 1; i < trail.length; i += 1) {
      const alpha = (i / trail.length) * 0.5;
      ctx.strokeStyle = over ? `rgba(255, 140, 60, ${alpha})` : `rgba(77, 227, 255, ${alpha})`;
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
  // Hull: a sleek dart with a salvage claw at the nose.
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
  // Salvage claw: two prongs that say "skiff", not "fighter".
  ctx.strokeStyle = '#b8f4ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(20, -4);
  ctx.lineTo(30, -8);
  ctx.moveTo(20, 4);
  ctx.lineTo(30, 8);
  ctx.stroke();
  // Cargo pod on the spine.
  ctx.fillStyle = '#0e7d99';
  ctx.fillRect(-4, -3, 12, 6);
  // Cockpit.
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Engine flame, flickering with speed; overdrive burns orange and long.
  const flame = 8 + Math.min(10, speed / 45) + Math.sin(time * 31) * 2 + (over ? 12 : 0);
  ctx.fillStyle = over ? 'rgba(255, 120, 40, 0.95)' : 'rgba(255, 179, 71, 0.9)';
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  ctx.lineTo(-14 - flame, 0);
  ctx.lineTo(-14, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  // A shield reads as a ring: one free hit, visible at a glance.
  if (state.shield) {
    const pulse = 1 + 0.08 * Math.sin(time * 6);
    ctx.strokeStyle = 'rgba(126, 249, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(126, 249, 255, 0.3)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
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
  ctx.fillStyle = h.kind === 'splitter' ? '#6b4d8f' : h.kind === 'weaver' ? '#1d4d33' : PALETTE.rockDark;
  ctx.fill();
  ctx.strokeStyle = h.kind === 'weaver' ? PALETTE.weaver : PALETTE.rock;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (h.kind === 'splitter') {
    ctx.fillStyle = PALETTE.splitter;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (h.kind === 'weaver') {
    // A pale core so a weaver reads as a different threat, not a plain rock.
    ctx.fillStyle = PALETTE.weaver;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMine(ctx, h, time) {
  const armed = h.armed > 0;
  const blink = armed && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(h.x, h.y);
  // A trigger ring so the danger radius is visible before it arms.
  ctx.strokeStyle = armed ? 'rgba(255, 93, 93, 0.85)' : 'rgba(255, 93, 93, 0.25)';
  ctx.lineWidth = armed ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.stroke();
  // Spiked shell.
  ctx.fillStyle = '#3a2b2b';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + time * 0.5;
    const r = i % 2 === 0 ? h.r + 5 : h.r * 0.7;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.mine;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = blink ? '#ffffff' : PALETTE.mine;
  ctx.beginPath();
  ctx.arc(0, 0, h.r * 0.42 + (armed ? 2 * Math.sin(time * 20) : 0), 0, Math.PI * 2);
  ctx.fill();
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
    else if (h.kind === 'mine') drawMine(ctx, h, state.time);
    else drawRock(ctx, h);
  }
  // The ship flies only while playing (or paused, or choosing an upgrade):
  // on the title screen it would sit behind the panel text, and on the
  // game-over screen it is gone.
  if (state.screen === 'playing' || state.screen === 'paused' || state.screen === 'upgrade') {
    drawShip(ctx, state.ship, state.time, state);
  }
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const b of state.blasts) {
    const alpha = Math.max(0, b.life / b.maxLife) * 0.85;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff5d5d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
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

function drawVignettes(ctx, state) {
  // A warm edge-glow while the combo is hot; a red flash when the hull is hit.
  const comboGlow = state.combo >= 3 ? Math.min(0.4, 0.12 + state.combo * 0.05) : 0;
  if (comboGlow > 0) {
    const g = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.32,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.78,
    );
    g.addColorStop(0, 'rgba(255, 179, 71, 0)');
    g.addColorStop(1, `rgba(255, 179, 71, ${comboGlow})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (state.hitFlash > 0) {
    const g = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.30,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
    );
    g.addColorStop(0, 'rgba(255, 93, 93, 0)');
    g.addColorStop(1, `rgba(255, 93, 93, ${state.hitFlash * 0.55})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
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
  // The arc, at a glance: five stars to the Beacon, and the embers to the
  // next one. A filled star is forged; an empty one is still to come.
  const toNext = state.embers - state.forged * 100;
  const progress = Math.max(0, Math.min(1, toNext / 100));
  for (let i = 0; i < WIN_STARS; i += 1) {
    drawStarIcon(ctx, 40 + i * 26, 122, 9, i < state.forged ? '#ffd700' : 'rgba(234, 242, 255, 0.22)');
  }
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(state.won ? 'BEACON LIT' : `NEXT STAR ${Math.min(100, toNext)}/100`, 170, 127);
  ctx.fillStyle = 'rgba(234, 242, 255, 0.14)';
  roundRect(ctx, 170, 134, 120, 6, 3);
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  if (progress > 0) {
    roundRect(ctx, 170, 134, Math.max(6, 120 * progress), 6, 3);
    ctx.fill();
  }
  if (state.combo > 1) {
    const width = 120;
    ctx.fillStyle = PALETTE.ember;
    ctx.font = '800 17px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, 28, 158);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.25)';
    ctx.fillRect(28, 166, width, 5);
    ctx.fillStyle = PALETTE.ember;
    ctx.fillRect(28, 166, width * Math.max(0, state.comboTimer / state.upg.comboWindow), 5);
  }

  // Core bar, top centre: charge is score fuel, nova fuel and overdrive
  // fuel at once.
  const barWidth = 300;
  const barX = FIELD.width / 2 - barWidth / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('CORE', FIELD.width / 2, 34);
  ctx.fillStyle = 'rgba(234, 242, 255, 0.14)';
  roundRect(ctx, barX, 42, barWidth, 14, 7);
  ctx.fill();
  const ready = state.core >= state.upg.novaCost;
  ctx.fillStyle = state.overdrive ? '#ff8c3c' : ready ? PALETTE.nova : PALETTE.ember;
  if (state.core > 0) {
    roundRect(ctx, barX, 42, Math.max(14, (barWidth * state.core) / state.upg.coreCap), 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, 42, barWidth, 14, 7);
  ctx.stroke();
  ctx.fillStyle = state.overdrive ? '#ff8c3c' : ready ? PALETTE.nova : PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    state.overdrive ? 'OVERDRIVE — BURNING CORE' : ready ? 'NOVA READY — SPACE or CLICK' : `NOVA AT ${state.upg.novaCost} CORE`,
    FIELD.width / 2,
    76,
  );

  // Hull hearts, top right; a shield ring beside them while it holds.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HULL', FIELD.width - 28, 34);
  for (let i = 0; i < state.maxHull; i += 1) {
    const x = FIELD.width - 40 - i * 30;
    drawHeart(ctx, x, 58, 22, i < state.hull ? '#ff5d7a' : 'rgba(234, 242, 255, 0.16)');
  }
  if (state.shield) {
    ctx.strokeStyle = 'rgba(126, 249, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(FIELD.width - 40 - state.maxHull * 30 - 14, 58, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.nova;
    ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('S', FIELD.width - 40 - state.maxHull * 30 - 14, 62);
  }

  if (state.hintTimer > 0 && state.screen === 'playing') {
    ctx.globalAlpha = Math.min(1, state.hintTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Move: mouse or WASD / arrows   •   Nova: SPACE or click   •   Overdrive: hold SHIFT   •   P: pause   •   M: mute', FIELD.width / 2, FIELD.height - 26);
    ctx.globalAlpha = 1;
  }
}

function drawBanner(ctx, state) {
  const b = state.banner;
  if (!b) return;
  const alpha = Math.min(1, b.life / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(b.text, FIELD.width / 2, 220);
  if (b.sub) {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '400 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(b.sub, FIELD.width / 2, 254);
  }
  ctx.restore();
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
  ctx.font = '800 88px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('EMBERDRIFT', cx, 196);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 25px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Forge a star from the dark.', cx, 238);

  drawPanel(ctx, cx - 330, 272, 660, 348);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '700 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('HOW TO PLAY', cx, 306);
  ctx.font = '400 17px "Segoe UI", system-ui, sans-serif';
  const lines = [
    'Collect glowing embers to charge your core —',
    'core is your score multiplier and your nova fuel.',
    'Golden embers are worth 5. Shield cells block one hit.',
    'Spend 30 core on a nova, or hold SHIFT to overdrive:',
    'burn core for speed and a bigger combo step.',
    'Every 100 embers forges a star: pick 1 of 3 upgrades.',
    'Forge 5 stars to light the Beacon and win.',
    '',
    'Move: mouse or WASD / arrows      Nova: SPACE or click',
    'Overdrive: SHIFT      Pause: P      Mute: M',
  ];
  lines.forEach((line, i) => {
    if (line !== '') ctx.fillText(line, cx, 336 + i * 23);
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
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', cx, 664);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '400 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('An original game  •  keyboard + mouse  •  your best score is saved on this machine', cx, 694);
  ctx.restore();
}

function drawUpgrade(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 29, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const cx = FIELD.width / 2;
  ctx.fillStyle = '#ffd700';
  ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('★ STAR FORGED ★', cx, 180);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Star ${state.forged} of ${WIN_STARS} — choose an upgrade.`, cx, 220);
  const cards = state.upgradeChoices;
  const cardW = 300;
  const cardH = 180;
  const gap = 24;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = cx - totalW / 2;
  const y = 280;
  state.upgradeCards = [];
  cards.forEach((up, i) => {
    const x = startX + i * (cardW + gap);
    state.upgradeCards.push({ x, y, w: cardW, h: cardH });
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = up.color;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.stroke();
    ctx.fillStyle = up.color;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 44, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a1026';
    ctx.font = '800 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(i + 1), x + cardW / 2, y + 52);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '800 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(up.name, x + cardW / 2, y + 104);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '400 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(up.desc, x + cardW / 2, y + 134);
  });
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '400 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press 1, 2 or 3 — or click a card.', cx, y + cardH + 46);
  ctx.restore();
}

function drawWin(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(7, 11, 29, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  const cx = FIELD.width / 2;
  ctx.fillStyle = '#ffd700';
  ctx.font = '800 68px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('★ BEACON LIT ★', cx, 210);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Five stars forged. The dark is lit.', cx, 250);

  drawPanel(ctx, cx - 280, 286, 560, 262);
  const rows = [
    ['SCORE', String(state.score)],
    ['BEST', String(state.best)],
    ['EMBERS', String(state.embers)],
    ['WAVE REACHED', String(state.wave)],
    ['BEST COMBO', `x${Math.max(1, state.stats.maxCombo)}`],
    ['GOLDEN EMBERS', String(state.stats.golden)],
    ['UPGRADES TAKEN', String(state.stats.upgrades)],
  ];
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 326 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(label, cx - 240, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(value, cx + 240, y);
  });
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.good;
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PRESS ENTER TO FLY AGAIN', cx, 606);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '400 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Or press C to keep drifting in the lit dark.', cx, 640);
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
  ctx.fillText('SIGNAL LOST', cx, 210);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('The drift claims another skiff.', cx, 248);

  drawPanel(ctx, cx - 280, 282, 560, 262);
  const rows = [
    ['SCORE', String(state.score)],
    ['BEST', String(state.best)],
    ['EMBERS', String(state.embers)],
    ['STARS FORGED', `${state.forged} / ${WIN_STARS}`],
    ['WAVE REACHED', String(state.wave)],
    ['BEST COMBO', `x${Math.max(1, state.stats.maxCombo)}`],
    ['GOLDEN EMBERS', String(state.stats.golden)],
  ];
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 322 + i * 32;
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
    ctx.fillText('★ NEW BEST ★', cx, 566);
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
  drawVignettes(ctx, state);
  if (state.screen === 'playing' || state.screen === 'paused' || state.screen === 'upgrade') drawHud(ctx, state);
  drawBanner(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'over') drawOver(ctx, state);
  if (state.screen === 'win') drawWin(ctx, state);
  if (state.screen === 'upgrade') drawUpgrade(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  ctx.restore();
}
