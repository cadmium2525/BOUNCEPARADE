// 生成画像（assets/sprites/manifest.json に登録された物）で描く。無ければ false を返し、コード描画に任せる。
import { weakMarker, stunStars } from './art.js';

export async function loadSprites(url) {
  const out = {};
  let man = {};
  try { man = await (await fetch(url)).json(); } catch { return out; }
  await Promise.all(Object.entries(man).map(([k, src]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { out[k] = im; res(); };
    im.onerror = () => res();
    im.src = src;
  })));
  return out;
}

// 画像を「高さ h・下端 (x, bottom)」で描く。flip で左右反転
function put(ctx, im, x, bottom, h, flip = false, sx = 1, sy = 1) {
  const w = (im.width / im.height) * h;
  ctx.save();
  ctx.translate(x, bottom);
  ctx.scale(flip ? -sx : sx, sy);
  ctx.drawImage(im, -w / 2, -h, w, h);
  ctx.restore();
}
function putCenter(ctx, im, x, y, h, rot = 0, sx = 1, sy = 1) {
  const w = (im.width / im.height) * h;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
  ctx.drawImage(im, -w / 2, -h / 2, w, h);
  ctx.restore();
}
// 足もとの影（背景から浮かせて見やすくする）
function shadow(ctx, x, y, w) {
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y - 1, w / 2, w / 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function flashed(ctx, on, fn) {
  if (!on) return fn();
  ctx.save(); ctx.filter = 'brightness(2.6) saturate(0.3)'; fn(); ctx.restore();
}

// ===== 敵・ギミック =====
// 画像を収める箱（幅, 高さ）。当たり判定より少しだけ大きく
const ENEMY_BOX = { korobot: [32, 32], gachigachi: [40, 32], fuwadrone: [36, 30], purun: [36, 26], togemaru: [32, 32], ponpon: [38, 32] };
const fitH = (im, [bw, bh]) => Math.min(bh, (bw * im.height) / im.width);

export function drawEntitySprite(ctx, S, e, t) {
  const bottom = e.y + e.h / 2;
  const enemy = S['enemy_' + e.type];
  if (enemy) {
    const h = fitH(enemy, ENEMY_BOX[e.type]);
    const flip = e.dir < 0;
    if (e.type !== 'fuwadrone') shadow(ctx, e.x, bottom + 1, e.w * 1.1);
    flashed(ctx, e.flash > 0, () => {
      switch (e.type) {
        case 'korobot': put(ctx, enemy, e.x, bottom + 1 - Math.abs(Math.sin(t * 10)) * 1.5, h, flip); break;
        case 'purun': { const w = Math.sin(t * 14) * e.wob; put(ctx, enemy, e.x, bottom + 1, h, flip, 1 + w * 0.2, 1 - w * 0.2); break; }
        case 'togemaru': putCenter(ctx, enemy, e.x, e.y, h, e.roll); break;
        case 'fuwadrone': putCenter(ctx, enemy, e.x, e.y, h, 0, flip ? -1 : 1); break;
        case 'ponpon': put(ctx, enemy, e.x + (e.state === 'Windup' ? Math.sin(t * 40) : 0), bottom + 1, h, flip); break;
        default: put(ctx, enemy, e.x, bottom + 1, h, flip);
      }
    });
    return true;
  }
  const g = (k) => S['gimmick_' + k];
  switch (e.type) {
    case 'coin': { const im = g('coin'); if (!im) return false; putCenter(ctx, im, e.x, e.y + Math.sin(t * 2 + e.phase) * 1.5, 13, 0, Math.max(0.15, Math.abs(Math.cos(t * 3 + e.phase))), 1); return true; }
    case 'heart': { const im = g('heart'); if (!im) return false; const k = 1 + Math.sin(t * 6) * 0.05; putCenter(ctx, im, e.x, e.y + Math.sin(t * 3) * 2, 15, 0, k, k); return true; }
    case 'spring': { const im = g('spring'); if (!im) return false; const c = e.anim > 0.5 ? (1 - e.anim) * 2 : e.anim * 2; put(ctx, im, e.x, bottom, 18, false, 1 + c * 0.15, 1 - c * 0.35 + (e.anim > 0 ? 0.15 : 0)); return true; }
    case 'bumper': { const im = g('bumper'); if (!im) return false; const k = 1 + e.anim * 0.18; putCenter(ctx, im, e.x, e.y, e.r * 2.3, 0, k, k); return true; }
    case 'launcher': { const im = g('launcher'); if (!im) return false; const rot = e.dirY < 0 ? -Math.PI / 2 : e.dirX < 0 ? Math.PI : 0; putCenter(ctx, im, e.x, e.y, 20, rot, 1 + e.anim * 0.15, 1); return true; }
    case 'switch': { const im = g(e.heavy ? 'switch_heavy' : 'switch'); if (!im) return false; put(ctx, im, e.x, bottom + 1, 12, false, 1, e.pressed ? 0.45 : 1); return true; }
    case 'press': { const im = g('press'); if (!im) return false; const top = e.topY - e.h / 2 - 8; ctx.fillStyle = '#7d8597'; ctx.fillRect(e.x - 4, top, 8, e.top - top); flashed(ctx, e.state === 'warn' && Math.floor(t * 16) % 2 === 0, () => ctx.drawImage(im, e.left - 3, e.top - 3, e.w + 6, e.h + 6)); return true; }
    case 'checkpoint': { const im = g(e.on ? 'checkpoint_on' : 'checkpoint_off'); if (!im) return false; put(ctx, im, e.x + 6, bottom + 1, 46); return true; }
    case 'goal': { const im = g('goal'); if (!im) return false; put(ctx, im, e.x + 10, e.baseY + 1, 84); return true; }
    case 'sign': { const im = g('sign'); if (!im) return false; put(ctx, im, e.x, e.y + 11, 22); return true; }
  }
  return false;
}

// ===== ボス =====
const BOSS_BOX = { drill_rhino: [124, 76], storm_cloud: [116, 80], magma_golem: [100, 96], bumper_spider: [108, 80], mogu_driller: [90, 80], freeze_king: [92, 100] };
const WEAK_POSE = {
  drill_rhino: (b) => b.state === 'Vulnerable',
  storm_cloud: (b) => b.state === 'Vulnerable' || b.state === 'Recovery',
  magma_golem: (b) => b.state === 'Vulnerable',
  bumper_spider: (b) => b.state === 'Recovery',
  mogu_driller: (b) => b.state === 'Vulnerable',
  freeze_king: (b) => b.state === 'Recovery',
};

export function drawBossSprite(ctx, S, b, t, floorY) {
  const weak = WEAK_POSE[b.id](b);
  const base = S[`boss_${b.id}_normal`];
  if (!base) return false;
  const im = (weak && S[`boss_${b.id}_weak`]) || base;
  // 縮尺は通常ポーズで決め、弱点ポーズも同じ縮尺で描く
  const h = fitH(base, BOSS_BOX[b.id]) * (im.height / base.height);
  const fl = b.flash > 0 && Math.floor(b.flash * 20) % 2 === 0;
  // 予告の表示（画像の外側）
  if (b.id === 'storm_cloud' && b.state === 'Telegraph') {
    ctx.save(); ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 25); ctx.fillStyle = '#fff36b'; ctx.fillRect(b.markX - 12, b.y, 24, floorY - b.y); ctx.restore();
  }
  if (b.id === 'mogu_driller') {
    if (b.state === 'Telegraph') { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 25); ctx.fillStyle = '#6a4a2a'; ctx.beginPath(); ctx.ellipse(b.markX, floorY, 26, 6, 0, Math.PI, 0); ctx.fill(); ctx.restore(); }
    if (b.under && b.state !== 'Attack') return true;
  }
  ctx.save();
  if (b.id === 'mogu_driller') { ctx.beginPath(); ctx.rect(b.x - 100, b.y - 160, 200, floorY - (b.y - 160)); ctx.clip(); }
  if (b.id === 'magma_golem' && !weak) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5); ctx.fillStyle = 'rgba(255,90,0,0.4)'; ctx.beginPath(); ctx.arc(b.x, b.y - 6, 44, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  const shake = b.state === 'Telegraph' ? Math.sin(t * 60) * 1.5 : 0;
  const flying = b.id === 'storm_cloud';
  if (!flying) shadow(ctx, b.x, b.y + b.h / 2 + 2, b.w * 1.3);
  flashed(ctx, fl, () => {
    if (flying) putCenter(ctx, im, b.x + shake, b.y + Math.sin(t * 2) * 2, h, 0, b.facing < 0 ? -1 : 1, 1);
    else put(ctx, im, b.x + shake, b.y + b.h / 2 + 2, h, b.facing < 0);
  });
  ctx.restore();
  if (b.state === 'Telegraph') { ctx.fillStyle = '#ff4040'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('！', b.x, b.y + b.h / 2 - h - 6); }
  if (b.id === 'storm_cloud' && b.windWarn) { ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.windDir > 0 ? '◀◀ 風' : '風 ▶▶', b.x, b.top - 22); ctx.restore(); }
  const wp = b.weakPoint;
  if (wp && (weak || b.id === 'bumper_spider' || b.id === 'freeze_king')) weakMarker(ctx, wp.x, wp.y, t, 8);
  if (weak && b.id !== 'storm_cloud' && b.id !== 'magma_golem') stunStars(ctx, b.x, b.y + b.h / 2 - h - 4, t);
  return true;
}

// ===== 背景 =====
export function bgImage(S, theme, layer) { return S[`bg_${theme}_${layer}`] || null; }
