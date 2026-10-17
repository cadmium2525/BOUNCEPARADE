// 敵・ボス・ギミックの手続き描画（キット同梱のアイコンは仮素材のため、コードで描く）
const OUT = '#1b1b2e';

export function circ(ctx, x, y, r, fill, stroke = OUT, lw = 2) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
export function rrect(ctx, x, y, w, h, r, fill, stroke = OUT, lw = 2) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function poly(ctx, pts, fill, stroke = OUT, lw = 2) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function eye(ctx, x, y, r, look = 0, angry = false, color = '#fff') {
  circ(ctx, x, y, r, color, OUT, 1.5);
  circ(ctx, x + look * r * 0.35, y + r * 0.1, r * 0.5, OUT, null);
  circ(ctx, x + look * r * 0.35 - r * 0.2, y - r * 0.15, r * 0.18, '#fff', null);
  if (angry) { ctx.beginPath(); ctx.moveTo(x - r * 1.1, y - r * 1.2); ctx.lineTo(x + r * 1.1, y - r * 0.55); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke(); }
}
function shine(ctx, x, y, rx, ry) {
  ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ===== アイテム =====
export function drawCoin(ctx, e, t) {
  const s = Math.abs(Math.cos(t * 3 + e.phase));
  const y = e.y + Math.sin(t * 2 + e.phase) * 1.5;
  ctx.save(); ctx.translate(e.x, y); ctx.scale(Math.max(0.15, s), 1);
  circ(ctx, 0, 0, 6, grad(ctx, -6, -6, 6, 6, [[0, '#fff3a3'], [0.5, '#ffd23f'], [1, '#e09a14']]), '#8a5a00', 1.5);
  ctx.fillStyle = '#c47d00'; ctx.fillRect(-1, -3.5, 2, 7);
  ctx.restore();
}
export function drawHeart(ctx, e, t) {
  const y = e.y + Math.sin(t * 3) * 2;
  ctx.save(); ctx.translate(e.x, y); ctx.scale(0.9 + Math.sin(t * 6) * 0.05, 0.9 + Math.sin(t * 6) * 0.05);
  heartPath(ctx, 0, 0, 7);
  ctx.fillStyle = '#ff4f73'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
  shine(ctx, -3, -3, 2, 1.4);
  ctx.restore();
}
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
export function drawCheckpoint(ctx, e, t) {
  const bx = e.x, by = e.y + e.h / 2;
  rrect(ctx, bx - 6, by - 6, 12, 6, 2, '#5b5f73');
  ctx.fillStyle = '#dfe3ee'; ctx.fillRect(bx - 1.5, by - 40, 3, 34);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeRect(bx - 1.5, by - 40, 3, 34);
  const wave = Math.sin(t * 6) * 2;
  const col = e.on ? '#3fdc7a' : '#ff5a5a';
  poly(ctx, [bx + 1.5, by - 40, bx + 20, by - 35 + wave, bx + 1.5, by - 28], col, OUT, 1.5);
  circ(ctx, bx, by - 41, 3, '#ffd23f', OUT, 1);
}
export function drawGoal(ctx, e, t) {
  const bx = e.x, by = e.baseY ?? e.y + e.h / 2;
  rrect(ctx, bx - 10, by - 8, 20, 8, 2, '#6c4bd1');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by - 70, 4, 62);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 2, by - 70, 4, 62);
  const w = Math.sin(t * 5) * 3;
  ctx.beginPath(); ctx.moveTo(bx + 2, by - 68);
  ctx.quadraticCurveTo(bx + 16, by - 66 + w, bx + 30, by - 64 + w);
  ctx.lineTo(bx + 30, by - 46 + w); ctx.quadraticCurveTo(bx + 16, by - 48 + w, bx + 2, by - 46); ctx.closePath();
  ctx.fillStyle = grad(ctx, bx, by - 68, bx + 30, by - 46, [[0, '#ff5a8a'], [0.5, '#ffd23f'], [1, '#4fd1ff']]); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
  star(ctx, bx + 15, by - 57 + w * 0.5, 5, '#fff');
  circ(ctx, bx, by - 72, 4, '#ffd23f', OUT, 1.5);
}
export function star(ctx, x, y, r, fill, stroke = null) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// ===== ギミック =====
export function drawSpring(ctx, e) {
  const bx = e.x, by = e.y + e.h / 2;
  const comp = e.anim > 0.5 ? (1 - e.anim) * 2 : e.anim * 2;
  const top = by - 12 - comp * 6 + (e.anim > 0 ? -2 : 0);
  rrect(ctx, bx - 8, by - 3, 16, 3, 1, '#4a4f60', OUT, 1);
  ctx.strokeStyle = '#c9ced9'; ctx.lineWidth = 2;
  ctx.beginPath();
  const n = 4;
  for (let i = 0; i <= n; i++) { const yy = by - 3 + (top + 3 - (by - 3)) * (i / n); ctx.lineTo(bx + (i % 2 ? 6 : -6), yy); }
  ctx.stroke();
  rrect(ctx, bx - 9, top - 3, 18, 4, 2, '#ff6a3d', OUT, 1.5);
}
export function drawBumper(ctx, e, t) {
  const r = e.r * (1 + e.anim * 0.18);
  if (e.anim > 0) circ(ctx, e.x, e.y, r + 5 * e.anim, null, `rgba(255,255,160,${e.anim})`, 3);
  circ(ctx, e.x, e.y, r, radial(ctx, e.x - 3, e.y - 3, 1, r, [[0, '#ff9a9a'], [1, '#e8233a']]));
  circ(ctx, e.x, e.y, r * 0.62, '#fff', OUT, 1.5);
  circ(ctx, e.x, e.y, r * 0.38, e.anim > 0 ? '#ffe45c' : '#ffb800', OUT, 1);
  shine(ctx, e.x - r * 0.4, e.y - r * 0.45, r * 0.25, r * 0.15);
}
export function drawLauncher(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y);
  const ang = e.dirY < 0 ? -Math.PI / 2 : e.dirX < 0 ? Math.PI : 0;
  ctx.rotate(ang);
  const k = e.anim;
  rrect(ctx, -8, -8, 16, 16, 3, '#3a3f55', OUT, 1.5);
  rrect(ctx, -2 - k * 2, -7, 12 + k * 3, 14, 2, grad(ctx, 0, -7, 0, 7, [[0, '#ffd36b'], [1, '#e08a1a']]), OUT, 1.5);
  circ(ctx, -3, 0, 3.5, '#1b1b2e', null);
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8);
  poly(ctx, [3, -3, 7, 0, 3, 3], '#fff', null);
  ctx.restore();
}
export function drawSwitch(ctx, e, t) {
  const bx = e.x, by = e.y + e.h / 2;
  const pressed = e.pressed;
  rrect(ctx, bx - 8, by - 3, 16, 3, 1, '#4b4f62', OUT, 1);
  const col = e.heavy ? '#8d5bff' : e.role === 'cool' ? '#3fc8ff' : e.role === 'clamp' ? '#ffcf3f' : '#ff4a5a';
  const h = pressed ? 1.5 : 5;
  rrect(ctx, bx - 6, by - 3 - h, 12, h, 2, col, OUT, 1.5);
  if (e.heavy && !pressed) { ctx.fillStyle = '#fff'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('重', bx, by - 3.5); }
  if (e.reusable && pressed && e.recharge > 0) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(bx - 7, by + 1, 14 * (1 - e.recharge / (e.rechargeTime || 4)), 2); }
  if (e.reusable && !pressed) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6); circ(ctx, bx, by - 6, 9, null, col, 1.5); ctx.globalAlpha = 1; }
}
export function drawFan(ctx, e, t) {
  const a = e.area;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    const ph = ((t * 1.6 + i / 7) % 1);
    if (e.dir === 'u' || e.dir === 'v') {
      const x = a.x + 6 + ((i * 7) % (a.w - 12));
      const y = e.dir === 'u' ? a.y + a.h * (1 - ph) : a.y + a.h * ph;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + (e.dir === 'u' ? -10 : 10)); ctx.stroke();
    } else {
      const s = e.dir === 'r' ? 1 : -1;
      const y = a.y + 6 + ((i * 7) % (a.h - 12));
      const x = s > 0 ? a.x + a.w * ph : a.x + a.w * (1 - ph);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 10, y); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.dir === 'r') ctx.rotate(Math.PI / 2); else if (e.dir === 'l') ctx.rotate(-Math.PI / 2); else if (e.dir === 'v') ctx.rotate(Math.PI);
  rrect(ctx, -12, -2, 24, 10, 3, '#5f6880', OUT, 1.5);
  ctx.save(); ctx.beginPath(); ctx.rect(-11, -8, 22, 7); ctx.clip();
  for (let i = 0; i < 4; i++) { const x = ((t * 60 + i * 6) % 24) - 12; ctx.fillStyle = i % 2 ? '#c6ccdb' : '#9aa3b8'; ctx.fillRect(x, -7, 4, 6); }
  ctx.restore();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(-11, -8, 22, 7);
  ctx.restore();
}
export function drawPress(ctx, e, t) {
  const top = e.topY - e.h / 2 - 8;
  ctx.fillStyle = '#7d8597'; ctx.fillRect(e.x - 4, top, 8, e.top - top);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(e.x - 4, top, 8, e.top - top);
  const warn = e.state === 'warn' && Math.floor(t * 16) % 2 === 0;
  rrect(ctx, e.left, e.top, e.w, e.h, 3, warn ? '#ff7a6a' : '#6c7488');
  ctx.save(); ctx.beginPath(); ctx.rect(e.left + 2, e.top + e.h - 8, e.w - 4, 6); ctx.clip();
  for (let x = e.left - 10; x < e.left + e.w + 10; x += 8) { ctx.fillStyle = '#ffd23f'; poly(ctx, [x, e.top + e.h, x + 4, e.top + e.h, x + 10, e.top + e.h - 8, x + 6, e.top + e.h - 8], '#ffd23f', null); }
  ctx.restore();
  for (const dx of [-14, 14]) circ(ctx, e.x + dx, e.top + 7, 2, '#c9ced9', OUT, 1);
}
export function drawPlatform(ctx, e, theme) {
  const col = theme === 'sky' ? '#ffffff' : theme === 'ice' ? '#d7f1ff' : theme === 'amusement' ? '#ffb3d0' : '#c3c8d6';
  rrect(ctx, e.left, e.top, e.w, e.h, 4, col, OUT, 1.5);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(e.left + 3, e.top + e.h - 4, e.w - 6, 2);
  if (e.box && e.box.magnet) { ctx.fillStyle = '#e8343f'; ctx.fillRect(e.left + 2, e.top + 2, e.w / 2 - 2, 3); ctx.fillStyle = '#3f6ce8'; ctx.fillRect(e.x, e.top + 2, e.w / 2 - 2, 3); }
}

// ===== 敵 =====
export function drawKorobot(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
  const bob = Math.abs(Math.sin(t * 10)) * 1.2;
  for (const wx of [-7, 7]) { circ(ctx, wx, 7, 5, '#3a3d4d', OUT, 1.5); ctx.save(); ctx.translate(wx, 7); ctx.rotate(e.x / 5 * e.dir); ctx.fillStyle = '#9aa0b5'; ctx.fillRect(-1, -4, 2, 8); ctx.restore(); }
  rrect(ctx, -12, -10 - bob, 24, 16, 5, grad(ctx, 0, -10, 0, 6, [[0, '#ffb05a'], [1, '#e8692a']]));
  rrect(ctx, -2, -9 - bob, 12, 9, 3, '#253047', OUT, 1.2);
  circ(ctx, 5, -4.5 - bob, 3, '#6cf2ff', null); circ(ctx, 6, -5.5 - bob, 1, '#fff', null);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -10 - bob); ctx.lineTo(-8, -15 - bob); ctx.stroke();
  circ(ctx, -8, -16 - bob, 2, '#ff4a4a', OUT, 1);
  ctx.restore();
}
export function drawGachigachi(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
  const fl = e.flash > 0;
  rrect(ctx, -14, 6, 28, 7, 3, '#2d2f3a', OUT, 1.5);
  for (let i = -10; i <= 10; i += 5) circ(ctx, i, 9.5, 1.5, '#6b6f80', null);
  ctx.beginPath(); ctx.ellipse(0, 4, 15, 15, 0, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = fl ? '#fff' : grad(ctx, 0, -11, 0, 4, [[0, '#8a93a8'], [1, '#4a5064']]); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 5; const x = Math.cos(a) * 14, y = 4 + Math.sin(a) * 14; poly(ctx, [x - 2.5, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5, x + 2.5, y], '#c9ced9', OUT, 1); }
  for (let i = -8; i <= 8; i += 8) circ(ctx, i, -2, 1.3, '#c9ced9', null);
  rrect(ctx, 3, -3, 10, 5, 2, '#20232e', OUT, 1);
  circ(ctx, 9, -0.5, 1.8, '#ff4040', null);
  ctx.restore();
}
export function drawFuwadrone(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
  ctx.fillStyle = '#3a3d4d'; ctx.fillRect(-1, -14, 2, 6);
  const pw = Math.abs(Math.sin(t * 40)) * 14 + 2;
  rrect(ctx, -pw, -16, pw * 2, 3, 1.5, '#c9ced9', OUT, 1);
  rrect(ctx, -12, -8, 24, 14, 6, grad(ctx, 0, -8, 0, 6, [[0, '#ffe066'], [1, '#e8a21a']]));
  circ(ctx, 4, -1, 5, '#fff', OUT, 1.5); circ(ctx, 5.5, -1, 2.5, OUT, null);
  ctx.fillStyle = '#ff7a3a'; for (const x of [-10, 10]) { ctx.beginPath(); ctx.arc(x, 7, 2.5 + Math.random(), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
export function drawPurun(ctx, e, t) {
  const w = Math.sin(t * 14) * e.wob;
  ctx.save(); ctx.translate(e.x, e.y + e.h / 2);
  ctx.scale(1 + w * 0.2, 1 - w * 0.2);
  ctx.beginPath();
  ctx.moveTo(-15, 0); ctx.bezierCurveTo(-17, -16, -8, -24, 0, -24); ctx.bezierCurveTo(8, -24, 17, -16, 15, 0); ctx.closePath();
  ctx.fillStyle = radial(ctx, -4, -16, 2, 26, [[0, '#ffd0ec'], [1, '#ff6fbf']]); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  shine(ctx, -6, -17, 4, 2.5);
  circ(ctx, -4, -11, 2, OUT, null); circ(ctx, 5, -11, 2, OUT, null);
  ctx.beginPath(); ctx.arc(0.5, -8, 2.5, 0.2, Math.PI - 0.2); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}
export function drawTogemaru(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.save(); ctx.rotate(e.roll);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; poly(ctx, [Math.cos(a - 0.22) * 9, Math.sin(a - 0.22) * 9, Math.cos(a) * 15, Math.sin(a) * 15, Math.cos(a + 0.22) * 9, Math.sin(a + 0.22) * 9], '#d7dbe6', OUT, 1); }
  ctx.restore();
  circ(ctx, 0, 0, 10, radial(ctx, -3, -3, 1, 12, [[0, '#7e8396'], [1, '#3a3d4d']]));
  eye(ctx, e.dir * 2 - 3, -1, 2.6, e.dir, true); eye(ctx, e.dir * 2 + 3, -1, 2.6, e.dir, true);
  ctx.restore();
}
export function drawPonpon(ctx, e, t) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
  const k = e.state === 'Windup' ? Math.sin(t * 40) * 1.2 : 0;
  rrect(ctx, -13, 4, 26, 9, 3, '#5a4a3a', OUT, 1.5);
  circ(ctx, -2, 0, 11, grad(ctx, 0, -11, 0, 11, [[0, '#8f97ad'], [1, '#4a5064']]));
  rrect(ctx, 2 + k, -6, 16, 10, 3, '#2d3040', OUT, 1.5);
  circ(ctx, 18 + k, -1, 4, '#121420', OUT, 1);
  eye(ctx, -5, -3, 3, 1, true);
  if (e.state === 'Windup') circ(ctx, 18, -1, 6 + Math.random() * 2, null, '#ff8a3a', 2);
  ctx.restore();
}
export function drawBullet(ctx, e, t) {
  const r = e.r;
  if (e.kind === 'web') { circ(ctx, e.x, e.y, r, '#f5f5ff', OUT, 1.2); ctx.strokeStyle = '#9aa0c0'; ctx.lineWidth = 0.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(e.x - r, e.y + (i - 1) * 3); ctx.lineTo(e.x + r, e.y - (i - 1) * 3); ctx.stroke(); } }
  else if (e.kind === 'lava') { circ(ctx, e.x, e.y, r + 2, 'rgba(255,120,0,0.3)', null); circ(ctx, e.x, e.y, r, radial(ctx, e.x - 2, e.y - 2, 1, r, [[0, '#ffe46b'], [1, '#ff4b14']]), '#5a1400', 1.5); }
  else if (e.kind === 'ice') { poly(ctx, [e.x, e.y - r - 2, e.x + r, e.y, e.x, e.y + r + 2, e.x - r, e.y], '#c9f1ff', '#2a6f9a', 1.5); }
  else if (e.kind === 'rock') { circ(ctx, e.x, e.y, r, '#8a6a4a', OUT, 1.5); }
  else { circ(ctx, e.x, e.y, r, radial(ctx, e.x - 2, e.y - 2, 1, r, [[0, '#6b6f80'], [1, '#1d1f2a']]), OUT, 1.5); shine(ctx, e.x - 2, e.y - 2, 1.6, 1); }
  if (e.reflected) circ(ctx, e.x, e.y, r + 3, null, '#7dfcff', 2);
}
export function drawHazard(ctx, e, t) {
  if (e.kind === 'bolt') {
    if (e.warn > 0) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#fff9b0'; ctx.lineWidth = 6; ctx.shadowColor = '#fff36b'; ctx.shadowBlur = 12;
    ctx.beginPath(); let y = e.top; ctx.moveTo(e.x, y);
    while (y < e.top + e.h) { y += 12; ctx.lineTo(e.x + (Math.random() - 0.5) * 16, y); }
    ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  } else if (e.kind === 'wave') {
    ctx.save(); ctx.globalAlpha = 0.9;
    poly(ctx, [e.left, e.top + e.h, e.x - 2, e.top - 4 + Math.sin(t * 30) * 2, e.left + e.w, e.top + e.h], '#ff8a2a', '#7a2300', 1.5);
    ctx.restore();
  }
}
export function drawFallRock(ctx, e, t, floorY) {
  if (e.warn > 0) {
    ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 20);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, floorY - 2, 12, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return;
  }
  poly(ctx, [e.x - 9, e.y, e.x - 4, e.y - 9, e.x + 6, e.y - 8, e.x + 9, e.y + 2, e.x + 2, e.y + 9, e.x - 7, e.y + 7], '#8a6a4a', OUT, 1.5);
}
export function drawPillar(ctx, e, t) {
  if (e.h < 3) return;
  ctx.save();
  rrect(ctx, e.left, e.top, e.w, e.h, 3, grad(ctx, e.left, 0, e.left + e.w, 0, [[0, '#a6e3ff'], [0.5, '#eafaff'], [1, '#7cc6ef']]), '#2a6f9a', 1.5);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(e.left + 5, e.top + 4, 3, Math.max(0, e.h - 8));
  ctx.restore();
  if (e.life < 1.2 && e.life > 0 && Math.floor(t * 10) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(e.left, e.top, e.w, e.h); }
}
export function drawSpray(ctx, e, t) {
  circ(ctx, e.x, e.y, 8, 'rgba(200,240,255,0.7)', '#5ab8e8', 1.5);
  star(ctx, e.x, e.y, 6, '#fff');
}

// ===== ボス =====
export function weakMarker(ctx, x, y, t, r = 7) {
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 12);
  circ(ctx, x, y, r + 4, 'rgba(255,60,90,0.35)', null);
  circ(ctx, x, y, r, radial(ctx, x - 2, y - 2, 1, r, [[0, '#fff'], [0.4, '#ff6b8a'], [1, '#d4143f']]), OUT, 1.5);
  ctx.restore();
  // 矢印
  const by = y - r - 10 + Math.sin(t * 8) * 3;
  poly(ctx, [x - 5, by - 6, x + 5, by - 6, x, by], '#ffe14d', OUT, 1.2);
}
function bossFlash(ctx, b) { return b.flash > 0 && Math.floor(b.flash * 20) % 2 === 0; }

export function drawDrillRhino(ctx, b, t) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing, 1);
  const shakeX = b.state === 'Telegraph' ? Math.sin(t * 60) * 1.5 : 0;
  const stun = b.state === 'Vulnerable';
  ctx.translate(shakeX, 0);
  const body = bossFlash(ctx, b) ? '#fff' : grad(ctx, 0, -26, 0, 26, [[0, '#8a96b4'], [1, '#4b5470']]);
  // 脚
  for (const lx of [-26, -10, 10, 24]) rrect(ctx, lx - 6, 12, 12, 14, 3, '#3a4058', OUT, 1.5);
  // 胴
  rrect(ctx, -38, -20, 66, 38, 14, body);
  // 装甲板
  rrect(ctx, -32, -24, 40, 14, 6, stun ? '#5a6280' : '#a5b0cc', OUT, 1.5);
  if (stun) { rrect(ctx, -30, -34, 18, 10, 3, '#a5b0cc', OUT, 1.5); }
  // 頭
  rrect(ctx, 14, -16, 24, 26, 8, body);
  eye(ctx, 26, -6, 4, 1, !stun);
  if (stun) { ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(23, -9); ctx.lineTo(29, -3); ctx.moveTo(29, -9); ctx.lineTo(23, -3); ctx.stroke(); }
  // ドリル
  const spin = b.state === 'Attack' || b.state === 'Telegraph' ? t * 30 : t * 2;
  ctx.save(); ctx.translate(38, 0);
  poly(ctx, [0, -12, 30, 0, 0, 12], grad(ctx, 0, -12, 0, 12, [[0, '#ffd36b'], [1, '#d97a12']]), OUT, 2);
  ctx.strokeStyle = '#8a4a00'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { const k = ((spin / 6 + i / 4) % 1); const x = k * 26; const h = 12 * (1 - x / 30); ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + 4, h); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
  if (b.state === 'Telegraph') { ctx.fillStyle = '#ff4040'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('！', b.x, b.top - 10); }
  if (stun) { weakMarker(ctx, b.x - b.facing * 10, b.top + 2, t, 8); stunStars(ctx, b.x + b.facing * 26, b.top - 4, t); }
}
export function stunStars(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) { const a = t * 5 + (i * Math.PI * 2) / 3; star(ctx, x + Math.cos(a) * 12, y + Math.sin(a) * 4, 4, '#ffe14d', OUT); }
}
export function drawStormCloud(ctx, b, t, floorY) {
  const tired = b.state === 'Vulnerable' || b.state === 'Recovery';
  // 雷の予告マーカー
  if (b.state === 'Telegraph') {
    ctx.save(); ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 25);
    ctx.fillStyle = '#fff36b'; ctx.fillRect(b.markX - 12, b.y, 24, floorY - b.y);
    ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.ellipse(b.markX, floorY - 2, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.translate(b.x, b.y);
  const fl = bossFlash(ctx, b);
  const c1 = fl ? '#fff' : tired ? '#c9d2e6' : b.state === 'Telegraph' ? '#4a4870' : '#6a6f96';
  const c2 = fl ? '#fff' : tired ? '#e8eef8' : '#9aa0c8';
  const puffs = [[-30, 6, 18], [-12, -8, 22], [12, -10, 22], [30, 4, 18], [0, 8, 20], [-22, 12, 14], [22, 12, 14]];
  for (const [x, y, r] of puffs) circ(ctx, x, y + Math.sin(t * 2 + x) * 1.5, r + 2, OUT, null);
  for (const [x, y, r] of puffs) circ(ctx, x, y + Math.sin(t * 2 + x) * 1.5, r, c1, null);
  for (const [x, y, r] of puffs) circ(ctx, x - 3, y - 4 + Math.sin(t * 2 + x) * 1.5, r * 0.6, c2, null);
  if (tired) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    for (const ex of [-10, 10]) { ctx.beginPath(); ctx.arc(ex, 2, 4, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.fillStyle = OUT; ctx.font = 'bold 10px sans-serif'; ctx.fillText('z', 30, -22 + Math.sin(t * 3) * 3); ctx.fillText('Z', 38, -32 + Math.sin(t * 3) * 3);
  } else {
    eye(ctx, -10, 2, 6, Math.sign(b.g.player.x - b.x), true); eye(ctx, 10, 2, 6, Math.sign(b.g.player.x - b.x), true);
    ctx.beginPath(); ctx.moveTo(-8, 14); ctx.quadraticCurveTo(0, 9, 8, 14); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
  // 風向き
  if (b.windWarn) { ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.windDir > 0 ? '◀◀ 風' : '風 ▶▶', b.x, b.top - 16); ctx.restore(); }
  if (tired) weakMarker(ctx, b.x, b.top + 4, t, 8);
}
export function drawMagmaGolem(ctx, b, t) {
  ctx.save(); ctx.translate(b.x, b.y);
  const cool = b.state === 'Vulnerable';
  const fl = bossFlash(ctx, b);
  const rock = fl ? '#fff' : cool ? '#7d8ca8' : '#4a3434';
  const crack = cool ? '#bfe8ff' : '#ff7a1a';
  const armUp = b.state === 'Telegraph' ? -1 : 0;
  // 腕
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 30, -14); ctx.rotate(armUp * s * -2.2);
    rrect(ctx, -9, -4, 18, 34, 8, rock); ctx.strokeStyle = crack; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(3, 14); ctx.lineTo(-2, 24); ctx.stroke();
    ctx.restore();
  }
  // 脚
  for (const s of [-1, 1]) rrect(ctx, s * 14 - 9, 20, 18, 18, 5, rock);
  // 胴
  rrect(ctx, -26, -30, 52, 54, 16, rock);
  ctx.strokeStyle = crack; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(-8, -8); ctx.lineTo(-14, 6); ctx.moveTo(16, -22); ctx.lineTo(8, -10); ctx.lineTo(18, 4); ctx.stroke();
  // 頭
  rrect(ctx, -14, -46, 28, 20, 8, rock);
  ctx.fillStyle = cool ? '#bfe8ff' : '#ffd23f';
  ctx.fillRect(-9, -40, 6, 4); ctx.fillRect(3, -40, 6, 4);
  ctx.restore();
  if (cool) weakMarker(ctx, b.x, b.y - 6, t, 9);
  else { ctx.save(); ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5); circ(ctx, b.x, b.y - 6, 40, 'rgba(255,90,0,0.4)', null); ctx.restore(); }
}
export function drawBumperSpider(ctx, b, t) {
  ctx.save(); ctx.translate(b.x, b.y);
  const fl = bossFlash(ctx, b);
  const dizzy = b.state === 'Recovery';
  // 脚
  ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const ph = Math.sin(t * 8 + i) * 3;
    ctx.beginPath(); ctx.moveTo(s * 10, 6); ctx.quadraticCurveTo(s * (26 + i * 6), -18 + ph, s * (24 + i * 7), 32); ctx.stroke();
  }
  ctx.strokeStyle = '#5a2a7a'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const ph = Math.sin(t * 8 + i) * 3; ctx.beginPath(); ctx.moveTo(s * 10, 6); ctx.quadraticCurveTo(s * (26 + i * 6), -18 + ph, s * (24 + i * 7), 32); ctx.stroke(); }
  // 胴
  circ(ctx, 0, 0, b.R, fl ? '#fff' : radial(ctx, -8, -10, 2, b.R, [[0, '#b38aff'], [1, '#5a2a9a']]));
  // 前面バンパー
  const f = b.facing;
  ctx.beginPath(); ctx.arc(0, 0, b.R + 1, f > 0 ? -1.2 : Math.PI - 1.2 + 0, f > 0 ? 1.2 : Math.PI + 1.2); ctx.lineWidth = 7; ctx.strokeStyle = '#ff3a4a'; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
  // 顔
  if (dizzy) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; for (const ey of [-8, 4]) { ctx.beginPath(); ctx.arc(f * 14, ey, 3.5, 0, Math.PI * 1.6); ctx.stroke(); } }
  else { eye(ctx, f * 14, -8, 4.5, f, true); eye(ctx, f * 16, 4, 3.5, f, true); circ(ctx, f * 6, -14, 2.5, '#ff3a4a', OUT, 1); }
  ctx.restore();
  weakMarker(ctx, b.x - b.facing * 24, b.y - 4, t, 7);
  if (dizzy) stunStars(ctx, b.x, b.top - 10, t);
  if (b.state === 'Telegraph') { ctx.fillStyle = '#ff4040'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('！', b.x, b.top - 12); }
}
export function drawMoguDriller(ctx, b, t, floorY) {
  if (b.state === 'Telegraph') {
    ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 25);
    ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(b.markX, floorY, 26, 6, 0, Math.PI, 0); ctx.fill();
    ctx.restore();
  }
  if (b.under && b.state !== 'Attack') return;
  ctx.save();
  ctx.beginPath(); ctx.rect(b.x - 80, b.y - 120, 160, floorY - (b.y - 120)); ctx.clip();
  ctx.translate(b.x, b.y);
  const fl = bossFlash(ctx, b);
  const stun = b.state === 'Vulnerable';
  // 体
  ctx.beginPath(); ctx.ellipse(0, 6, 26, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = fl ? '#fff' : radial(ctx, -6, -4, 2, 30, [[0, '#c98a5a'], [1, '#7a4a2a']]); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 12, 15, 14, 0, 0, Math.PI * 2); ctx.fillStyle = '#e8c4a0'; ctx.fill();
  // ヘルメット・ドリル
  if (!stun) {
    ctx.beginPath(); ctx.ellipse(0, -14, 24, 14, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#ffcf3f'; ctx.fill(); ctx.stroke();
    circ(ctx, 0, -20, 4, '#fff8c0', OUT, 1.5);
    const spin = t * 25;
    ctx.save(); ctx.translate(0, -26);
    poly(ctx, [-10, 0, 0, -26, 10, 0], grad(ctx, -10, 0, 10, 0, [[0, '#c9ced9'], [1, '#6b7388']]), OUT, 2);
    ctx.strokeStyle = '#3a3f55'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const k = ((spin / 6 + i / 3) % 1); const y = -k * 22; const w = 10 * (1 + y / 26); ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y - 4); ctx.stroke(); }
    ctx.restore();
  } else {
    // ヘルメットが外れた
    ctx.beginPath(); ctx.ellipse(-24, -26, 14, 8, -0.6, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#ffcf3f'; ctx.fill(); ctx.stroke();
  }
  // 顔
  if (stun) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; for (const ex of [-8, 8]) { ctx.beginPath(); ctx.moveTo(ex - 3, -6); ctx.lineTo(ex + 3, 0); ctx.moveTo(ex + 3, -6); ctx.lineTo(ex - 3, 0); ctx.stroke(); } }
  else { ctx.fillStyle = OUT; ctx.fillRect(-11, -6, 6, 3); ctx.fillRect(5, -6, 6, 3); }
  circ(ctx, 0, 4, 4, '#ff7a9a', OUT, 1.5);
  // 爪
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 24, 14); for (let i = -1; i <= 1; i++) poly(ctx, [0, i * 4 - 2, s * 9, i * 5, 0, i * 4 + 2], '#eee', OUT, 1); ctx.restore(); }
  ctx.restore();
  if (stun) { weakMarker(ctx, b.x, b.top + 6, t, 8); stunStars(ctx, b.x, b.top - 8, t); }
  if (b.state === 'Surface' && b.armed === 0) {
    // クランプが降りてくるヒント
  }
}
export function drawFreezeKing(ctx, b, t) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.facing, 1);
  const fl = bossFlash(ctx, b);
  // マント
  poly(ctx, [-6, -28, -30, 36, 14, 36], fl ? '#fff' : '#3a5ab8', OUT, 2);
  // 体
  rrect(ctx, -16, -20, 32, 56, 12, fl ? '#fff' : grad(ctx, 0, -20, 0, 36, [[0, '#e8f6ff'], [1, '#8fc4ea']]));
  // ひげ
  poly(ctx, [-12, -10, 12, -10, 6, 14, 0, 20, -6, 14], '#ffffff', OUT, 1.5);
  // 顔
  rrect(ctx, -12, -34, 24, 22, 8, '#cfeaff');
  eye(ctx, 6, -24, 3.5, 1, true, '#fff');
  eye(ctx, -3, -24, 3, 1, true, '#fff');
  // 冠
  poly(ctx, [-12, -34, -12, -46, -6, -40, 0, -50, 6, -40, 12, -46, 12, -34], '#ffd23f', OUT, 1.5);
  circ(ctx, 0, -41, 2.5, '#6cf2ff', OUT, 1);
  // 盾（正面）
  ctx.save(); ctx.globalAlpha = 0.85;
  poly(ctx, [20, -24, 34, -18, 34, 18, 20, 30, 16, 4], grad(ctx, 16, 0, 34, 0, [[0, '#bff0ff'], [1, '#6ac4f0']]), '#1f5f8a', 2);
  ctx.restore();
  // 笏
  const raise = b.state === 'Telegraph' ? -16 : 0;
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-20, -18 + raise); ctx.stroke();
  star(ctx, -20, -22 + raise, 6, '#bff7ff', OUT);
  ctx.restore();
  weakMarker(ctx, b.x - b.facing * 22, b.y + 4, t, 7);
  if (b.state === 'Recovery') { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ふぅ…', b.x, b.top - 8); }
}

export function drawSign(ctx, e, t) {
  const bx = e.x, by = e.y + 10;
  ctx.fillStyle = '#7a5030'; ctx.fillRect(bx - 1.5, by - 10, 3, 10);
  rrect(ctx, bx - 9, by - 20, 18, 12, 2, '#d8a060', OUT, 1.5);
  ctx.fillStyle = '#7a4a20'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('！', bx, by - 10.5);
}

export const ENTITY_ART = {
  sign: drawSign,
  coin: drawCoin, heart: drawHeart, checkpoint: drawCheckpoint, goal: drawGoal, spring: drawSpring, bumper: drawBumper,
  launcher: drawLauncher, switch: drawSwitch, fan: drawFan, press: drawPress, korobot: drawKorobot, gachigachi: drawGachigachi,
  fuwadrone: drawFuwadrone, purun: drawPurun, togemaru: drawTogemaru, ponpon: drawPonpon, bullet: drawBullet, hazard: drawHazard,
  pillar: drawPillar, spray: drawSpray,
};
export const BOSS_ART = {
  drill_rhino: drawDrillRhino, storm_cloud: drawStormCloud, magma_golem: drawMagmaGolem,
  bumper_spider: drawBumperSpider, mogu_driller: drawMoguDriller, freeze_king: drawFreezeKing,
};
