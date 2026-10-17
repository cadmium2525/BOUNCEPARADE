import { TILE, T, ZONE_BALL } from './consts.js';
import { ENTITY_ART, BOSS_ART, drawPlatform, drawFallRock, circ, star } from './art.js';
import { drawEntitySprite, drawBossSprite, bgImage } from './sprites.js';

export const THEMES = {
  grass: { name: 'はじまりの丘', sky: ['#5fc2ff', '#c9f1ff'], far: '#a6dcb4', mid: '#6cc35a', top: '#5cd13a', topHi: '#a8f26c', body: '#b8743a', bodyDk: '#8a5427', bodyLt: '#d08d4f', brick: ['#e0884a', '#a4521e'], oneway: '#c48a4a', deco: 'hills' },
  factory: { name: '工場', sky: ['#252c48', '#6a5468'], far: '#363e5c', mid: '#454d6c', top: '#c9ced9', topHi: '#ffd23f', body: '#66708a', bodyDk: '#465068', bodyLt: '#8a93a8', brick: ['#8a6a5a', '#5a443a'], oneway: '#9aa3b8', deco: 'factory' },
  sky: { name: '天空都市', sky: ['#4aaaf8', '#e8f7ff'], far: '#ffffff', mid: '#d6ebff', top: '#ffffff', topHi: '#ffe58a', body: '#dfe7f5', bodyDk: '#b4c2da', bodyLt: '#f6f9ff', brick: ['#f2d27a', '#c9a24a'], oneway: '#ffffff', deco: 'clouds' },
  volcano: { name: '火山', sky: ['#200808', '#a8361a'], far: '#4a1a14', mid: '#5a2418', top: '#8a5a3a', topHi: '#c27a3a', body: '#4a3434', bodyDk: '#2e2020', bodyLt: '#6a4a44', brick: ['#6a4a3a', '#3a2a22'], oneway: '#7a5a44', deco: 'volcano' },
  amusement: { name: '遊園地', sky: ['#33206a', '#ff8fb1'], far: '#5a3a8a', mid: '#7a4aa0', top: '#ff5a9a', topHi: '#ffd0e4', body: '#ffe4ef', bodyDk: '#f2a8c8', bodyLt: '#ffffff', brick: ['#5ac8ff', '#2a8ad0'], oneway: '#ffd23f', deco: 'tents' },
  mine: { name: '地下鉱山', sky: ['#0e0b08', '#2e241c'], far: '#211a14', mid: '#30261c', top: '#8a7356', topHi: '#a88e6a', body: '#5a4836', bodyDk: '#3e3125', bodyLt: '#6e5a44', brick: ['#7a6040', '#4a3a26'], oneway: '#8a6a3a', deco: 'mine' },
  ice: { name: '氷雪城', sky: ['#86ccff', '#eef9ff'], far: '#cfe6f7', mid: '#a9d0ec', top: '#ffffff', topHi: '#e6f6ff', body: '#9cc9ea', bodyDk: '#6aa4d0', bodyLt: '#c4e2f6', brick: ['#c9d9ea', '#8aa0bc'], oneway: '#dff2ff', deco: 'castle' },
  final: { name: 'パレードタワー', sky: ['#120d36', '#5a2a8a'], far: '#2a1f5a', mid: '#3a2a72', top: '#ffd23f', topHi: '#fff3a0', body: '#5a4ab8', bodyDk: '#3a2f8a', bodyLt: '#7a6ad8', brick: ['#ff5a8a', '#c02a5a'], oneway: '#ffd23f', deco: 'parade' },
};

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// ===== ボールアトラス：各セルの不透明部分からスプライトの実寸を測り、コライダー半径に合わせる =====
export function analyzeAtlas(img, atlas) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const info = {};
  for (const [id, s] of Object.entries(atlas.sprites)) {
    const f = s.frame;
    const d = x.getImageData(f.x, f.y, f.w, f.h).data;
    let x0 = f.w, y0 = f.h, x1 = -1, y1 = -1;
    for (let yy = 0; yy < f.h; yy++) for (let xx = 0; xx < f.w; xx++) {
      if (d[(yy * f.w + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = f.w - 1; y1 = f.h - 1; }
    info[id] = { frame: f, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, hw: (x1 - x0 + 1) / 2, hh: (y1 - y0 + 1) / 2 };
  }
  return info;
}

export function drawBallSprite(ctx, assets, def, x, y, angle, sx = 1, sy = 1, alpha = 1) {
  const img = assets.ballsImg, inf = assets.ballInfo && assets.ballInfo[def.id];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.rotate(angle);
  if (img && inf) {
    // 見た目の半径をコライダーへ合わせる（トゲ・炎など装飾の分だけ少し大きめ）
    const visR = def.halfLen ? inf.hw : Math.max(inf.hw, inf.hh);
    const targetR = def.halfLen ? def.halfLen + def.r : def.r;
    const k = (targetR / visR) * (def.spriteScale || 1.04);
    const f = inf.frame;
    ctx.drawImage(img, f.x, f.y, f.w, f.h, -inf.cx * k, -inf.cy * k, f.w * k, f.h * k);
  } else {
    circ(ctx, 0, 0, def.r, '#fff');
  }
  ctx.restore();
}

// ===== 背景 =====
function drawDeco(ctx, theme, layer, W, H, s) {
  const th = THEMES[theme];
  const col = layer === 'far' ? th.far : th.mid;
  ctx.fillStyle = col;
  const R = (i) => hash(i, layer === 'far' ? 7 : 13);
  switch (th.deco) {
    case 'hills': {
      if (layer === 'far') {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * 0.55 - Math.sin((x / W) * Math.PI * 4) * 30 - Math.sin((x / W) * Math.PI * 10) * 10);
        ctx.lineTo(W, H); ctx.fill();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; const cx = R(i) * W, cy = 40 + R(i + 9) * 70; for (const [dx, dy, r] of [[0, 0, 16], [16, 4, 12], [-16, 4, 12], [8, -8, 12]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, 7); ctx.fill(); } }
      } else {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, H * 0.72 - Math.sin((x / W) * Math.PI * 6 + 1) * 18);
        ctx.lineTo(W, H); ctx.fill();
        for (let i = 0; i < 9; i++) { const x = R(i) * W, y = H * 0.72 - Math.sin((x / W) * Math.PI * 6 + 1) * 18; ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 2, y - 26, 4, 26); ctx.fillStyle = '#3fa045'; ctx.beginPath(); ctx.arc(x, y - 30, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#5cc35a'; ctx.beginPath(); ctx.arc(x - 3, y - 33, 7, 0, 7); ctx.fill(); }
      }
      break;
    }
    case 'factory': {
      if (layer === 'far') {
        for (let i = 0; i < 8; i++) { const x = (i / 8) * W, w = 70 + R(i) * 50, h = 90 + R(i + 3) * 120; ctx.fillRect(x, H - h, w, h); ctx.fillRect(x + w * 0.6, H - h - 60, 14, 60); ctx.fillStyle = 'rgba(255,210,120,0.5)'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 8 + (k % 3) * 18, H - h + 14 + Math.floor(k / 3) * 22, 8, 10); ctx.fillStyle = col; }
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = 10;
        for (let i = 0; i < 4; i++) { const y = H * 0.35 + i * 50; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + (i % 2 ? 20 : -10)); ctx.stroke(); }
        for (let i = 0; i < 4; i++) { const cx = R(i) * W, cy = H * 0.5 + R(i + 5) * 80, r = 20 + R(i + 2) * 16; ctx.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? r : r + 6; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.fill(); }
      }
      break;
    }
    case 'clouds': {
      if (layer === 'far') {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 9; i++) { const cx = R(i) * W, cy = 60 + R(i + 4) * 200; for (const [dx, dy, r] of [[0, 0, 26], [26, 8, 20], [-26, 8, 20], [12, -12, 18], [-10, -10, 16]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, 7); ctx.fill(); } }
      } else {
        for (let i = 0; i < 6; i++) { const x = R(i) * W, y = 140 + R(i + 2) * 120; ctx.fillStyle = '#cfe0f5'; ctx.beginPath(); ctx.moveTo(x - 50, y); ctx.lineTo(x + 50, y); ctx.lineTo(x + 20, y + 40); ctx.lineTo(x - 20, y + 40); ctx.fill(); ctx.fillStyle = '#e8f1ff'; for (let k = 0; k < 3; k++) { const tw = 14, th2 = 30 + R(i * 3 + k) * 50; ctx.fillRect(x - 35 + k * 26, y - th2, tw, th2); ctx.beginPath(); ctx.moveTo(x - 35 + k * 26 - 2, y - th2); ctx.lineTo(x - 35 + k * 26 + tw / 2, y - th2 - 12); ctx.lineTo(x - 35 + k * 26 + tw + 2, y - th2); ctx.fillStyle = '#ffd77a'; ctx.fill(); ctx.fillStyle = '#e8f1ff'; } }
      }
      break;
    }
    case 'volcano': {
      if (layer === 'far') {
        ctx.beginPath(); ctx.moveTo(W * 0.2, H); ctx.lineTo(W * 0.45, H * 0.3); ctx.lineTo(W * 0.55, H * 0.3); ctx.lineTo(W * 0.85, H); ctx.fill();
        const g = ctx.createRadialGradient(W * 0.5, H * 0.3, 2, W * 0.5, H * 0.3, 90); g.addColorStop(0, 'rgba(255,160,40,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = g; ctx.fillRect(W * 0.3, H * 0.05, W * 0.4, H * 0.5);
        ctx.fillStyle = 'rgba(80,40,40,0.6)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(W * 0.5 + (i - 2) * 20, H * 0.2 - i * 18, 18 + i * 4, 0, 7); ctx.fill(); }
      } else {
        for (let i = 0; i < 10; i++) { const x = R(i) * W, h = 60 + R(i + 1) * 120; ctx.beginPath(); ctx.moveTo(x - 22, H); ctx.lineTo(x - 6, H - h); ctx.lineTo(x + 8, H - h + 10); ctx.lineTo(x + 24, H); ctx.fill(); }
      }
      break;
    }
    case 'tents': {
      if (layer === 'far') {
        const cx = W * 0.3, cy = H * 0.45, r = 100;
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = ['#ff7ab0', '#ffd23f', '#6ad0ff'][k % 3]; ctx.fillRect(cx + Math.cos(a) * r - 6, cy + Math.sin(a) * r, 12, 10); }
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 40, H); ctx.lineTo(cx, cy); ctx.lineTo(cx + 40, H); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * 0.55, H * 0.8); for (let x = W * 0.55; x < W; x += 10) ctx.lineTo(x, H * 0.55 + Math.sin(x / 40) * 50); ctx.stroke();
      } else {
        for (let i = 0; i < 4; i++) { const x = (i + 0.3) * W / 4, w = 90, y = H * 0.6; for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ff6fa0' : '#fff2f7'; ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.lineTo(x - w / 2 + (k * w) / 6, y + 40); ctx.lineTo(x - w / 2 + ((k + 1) * w) / 6, y + 40); ctx.fill(); } ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x, y - 66); ctx.lineTo(x + 14, y - 60); ctx.lineTo(x, y - 54); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(x - w / 2, y + 40, w, H); }
      }
      break;
    }
    case 'mine': {
      if (layer === 'far') {
        for (let i = 0; i < 14; i++) { const x = R(i) * W, y = R(i + 7) * H; ctx.fillStyle = ['#5a8aff', '#ff6ad0', '#6affd0'][i % 3]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 5, y); ctx.fill(); ctx.globalAlpha = 1; }
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 30 + R(x) * 40); ctx.lineTo(W, 0); ctx.fill();
      } else {
        for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5; ctx.fillStyle = '#4a3624'; ctx.fillRect(x - 6, H * 0.25, 12, H); ctx.fillRect(x - 40, H * 0.25, 80, 10); ctx.fillStyle = 'rgba(255,200,80,0.9)'; ctx.beginPath(); ctx.arc(x + 24, H * 0.25 + 18, 5, 0, 7); ctx.fill(); const g = ctx.createRadialGradient(x + 24, H * 0.25 + 18, 2, x + 24, H * 0.25 + 18, 40); g.addColorStop(0, 'rgba(255,200,80,0.35)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(x - 20, H * 0.25 - 22, 90, 80); }
      }
      break;
    }
    case 'castle': {
      if (layer === 'far') {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let i = 0; i <= 8; i++) { ctx.lineTo((i / 8) * W, H * 0.4 + (i % 2) * 60 + R(i) * 20); }
        ctx.lineTo(W, H); ctx.fill();
        ctx.fillStyle = '#fff'; for (let i = 0; i < 8; i += 2) { const x = (i / 8) * W, y = H * 0.4 + R(i) * 20; ctx.beginPath(); ctx.moveTo(x - 30, y + 26); ctx.lineTo(x, y); ctx.lineTo(x + 30, y + 26); ctx.fill(); }
      } else {
        for (let i = 0; i < 3; i++) { const x = (i + 0.4) * W / 3, y = H * 0.5; ctx.fillStyle = col; ctx.fillRect(x - 40, y, 80, H); for (const dx of [-40, 26]) { ctx.fillRect(x + dx, y - 50, 14, 60); ctx.beginPath(); ctx.moveTo(x + dx - 4, y - 50); ctx.lineTo(x + dx + 7, y - 72); ctx.lineTo(x + dx + 18, y - 50); ctx.fill(); } ctx.fillStyle = '#e8f6ff'; ctx.fillRect(x - 6, y + 20, 12, 18); }
      }
      break;
    }
    case 'parade': {
      if (layer === 'far') {
        for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + R(i) * 0.7})`; ctx.fillRect(R(i + 100) * W, R(i + 200) * H * 0.7, 1.5, 1.5); }
        for (let i = 0; i < 4; i++) { const cx = R(i) * W, cy = 50 + R(i + 9) * 90; ctx.strokeStyle = ['#ff7ab0', '#ffd23f', '#6ad0ff', '#7dffb0'][i]; ctx.lineWidth = 1.5; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); ctx.stroke(); } }
      } else {
        for (let i = 0; i < 5; i++) { const x = (i + 0.5) * W / 5, h = 120 + R(i) * 100; ctx.fillStyle = col; ctx.fillRect(x - 18, H - h, 36, h); ctx.beginPath(); ctx.moveTo(x - 24, H - h); ctx.lineTo(x, H - h - 34); ctx.lineTo(x + 24, H - h); ctx.fill(); ctx.fillStyle = ['#ff5a8a', '#ffd23f', '#5ac8ff'][i % 3]; ctx.beginPath(); ctx.moveTo(x, H - h - 34); ctx.lineTo(x, H - h - 52); ctx.lineTo(x + 16, H - h - 46); ctx.fill(); ctx.fillStyle = 'rgba(255,240,150,0.7)'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 5, H - h + 20 + k * 30, 10, 14); }
      }
      break;
    }
  }
}

// ===== タイル（16px のピクセル調） =====
function drawTile(ctx, level, tx, ty, x, y, theme) {
  const th = THEMES[theme];
  const t = level.tile(tx, ty);
  const up = level.tile(tx, ty - 1), dn = level.tile(tx, ty + 1);
  const solidUp = level.solidAt(tx, ty - 1), solidL = level.solidAt(tx - 1, ty), solidR = level.solidAt(tx + 1, ty), solidDn = level.solidAt(tx, ty + 1);
  const h = hash(tx, ty);
  const px = (cx, cy, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + cx, y + cy, w, hh); };
  switch (t) {
    case T.SOLID: case T.LAVA: {
      if (t === T.LAVA) {
        const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#ff8a1a'); g.addColorStop(1, '#c42a0a');
        ctx.fillStyle = g; ctx.fillRect(x, y, 16, 16);
        if (h > 0.6) px(4 + Math.floor(h * 6), 6 + Math.floor(h * 5), 3, 2, '#ffd23f');
        break;
      }
      px(0, 0, 16, 16, th.body);
      // 模様
      for (let i = 0; i < 3; i++) { const a = hash(tx * 3 + i, ty * 7 - i); px(Math.floor(a * 14), Math.floor(hash(ty + i, tx) * 14), 2, 2, i === 0 ? th.bodyLt : th.bodyDk); }
      if (theme === 'factory') { px(0, 0, 16, 1, th.bodyLt); px(0, 15, 16, 1, th.bodyDk); if (h > 0.7) { px(3, 3, 2, 2, th.bodyLt); px(11, 11, 2, 2, th.bodyLt); } }
      if (theme === 'final' || theme === 'amusement') { if ((tx + ty) % 2 === 0) px(0, 0, 16, 16, th.bodyDk + '55'); }
      if (!solidL) px(0, 0, 1, 16, th.bodyDk);
      if (!solidR) px(15, 0, 1, 16, th.bodyDk);
      if (!solidDn) px(0, 14, 16, 2, th.bodyDk);
      if (!solidUp) {
        px(0, 0, 16, 5, th.top);
        px(0, 0, 16, 1, th.topHi);
        if (theme === 'grass' || theme === 'final' || theme === 'amusement') { for (let i = 0; i < 4; i++) if (hash(tx * 4 + i, 99) > 0.5) px(i * 4 + 1, 5, 2, 2 + Math.floor(hash(tx, i) * 2), th.top); }
        if (theme === 'factory') { for (let i = 0; i < 4; i++) px(i * 4, 1, 2, 3, i % 2 ? '#2a2f3d' : th.topHi); }
        if (theme === 'ice' || theme === 'sky') { px(0, 5, 16, 1, th.bodyLt); if (h > 0.5) px(Math.floor(h * 12), 5, 3, 3, th.top); }
        if (theme === 'volcano') { if (h > 0.6) px(Math.floor(h * 12), 2, 3, 1, '#ff7a2a'); }
      }
      break;
    }
    case T.BRICK: {
      const [a, b] = th.brick;
      px(0, 0, 16, 16, b);
      const off = ty % 2 ? 4 : 0;
      for (let r = 0; r < 2; r++) for (let c = -1; c < 2; c++) { const bx = c * 8 + (r ? off + 4 : off); px(Math.max(0, bx + 1), r * 8 + 1, Math.min(7, 16 - Math.max(0, bx + 1)), 6, a); }
      px(0, 0, 16, 1, '#ffffff33');
      break;
    }
    case T.ONEWAY: {
      px(0, 0, 16, 5, th.oneway); px(0, 0, 16, 1, '#ffffff88'); px(0, 4, 16, 1, '#00000055');
      if (!level.solidAt(tx, ty + 1) && (tx % 3 === 0)) px(6, 5, 4, 4, '#00000033');
      break;
    }
    case T.SPIKE: {
      const dir = !solidUp ? 'up' : !solidDn ? 'down' : !solidL ? 'left' : 'right';
      ctx.save(); ctx.translate(x + 8, y + 8);
      ctx.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[dir]);
      ctx.fillStyle = '#5a5f73'; ctx.fillRect(-8, 4, 16, 4);
      for (const sx of [-4, 4]) {
        ctx.beginPath(); ctx.moveTo(sx - 4, 4); ctx.lineTo(sx, -8); ctx.lineTo(sx + 4, 4); ctx.closePath();
        ctx.fillStyle = '#e6e9f2'; ctx.fill(); ctx.strokeStyle = '#2a2d3d'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#9aa0b5'; ctx.beginPath(); ctx.moveTo(sx, -8); ctx.lineTo(sx + 4, 4); ctx.lineTo(sx + 1, 4); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case T.ICE: {
      px(0, 0, 16, 16, '#9ad8f6'); px(0, 0, 16, 2, '#e8fbff');
      ctx.fillStyle = '#ffffff99'; ctx.beginPath(); ctx.moveTo(x + 3, y + 14); ctx.lineTo(x + 12, y + 3); ctx.lineTo(x + 14, y + 3); ctx.lineTo(x + 5, y + 14); ctx.fill();
      if (!solidDn) px(0, 15, 16, 1, '#4a8ab8');
      break;
    }
    case T.MAGNET: {
      px(0, 0, 16, 16, '#6c7488');
      px(0, 0, 8, 16, (tx + ty) % 2 ? '#d8343f' : '#3f6ce8');
      px(8, 0, 8, 16, (tx + ty) % 2 ? '#3f6ce8' : '#d8343f');
      px(0, 0, 16, 1, '#ffffff66'); px(0, 15, 16, 1, '#00000066');
      px(7, 0, 2, 16, '#c9ced9');
      break;
    }
    case T.HEAVY: {
      px(0, 0, 16, 16, '#3c4152');
      const topE = level.tile(tx, ty - 1) !== T.HEAVY, botE = level.tile(tx, ty + 1) !== T.HEAVY, lE = level.tile(tx - 1, ty) !== T.HEAVY, rE = level.tile(tx + 1, ty) !== T.HEAVY;
      const stripe = (sx, sy, w, hh) => { for (let i = 0; i < Math.max(w, hh); i += 4) { const c = ((tx * 16 + ty * 16 + i) / 4) % 2 ? '#ffd23f' : '#222'; if (w > hh) px(sx + i, sy, Math.min(4, w - i), hh, c); else px(sx, sy + i, w, Math.min(4, hh - i), c); } };
      if (topE) stripe(0, 0, 16, 3); if (botE) stripe(0, 13, 16, 3); if (lE) stripe(0, 0, 3, 16); if (rE) stripe(13, 0, 3, 16);
      px(4, 4, 8, 8, '#4f566c'); px(5, 5, 2, 2, '#8a93a8'); px(9, 9, 2, 2, '#8a93a8');
      ctx.strokeStyle = '#1d2030'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 4, y + 12); ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 7, y + 5); ctx.stroke();
      break;
    }
    case T.MELT: {
      if (theme === 'ice' || theme === 'sky' || theme === 'final' || theme === 'volcano') {
        px(0, 0, 16, 16, '#bfeaff'); px(1, 1, 14, 14, '#9ad8f6'); px(2, 2, 4, 2, '#ffffff'); px(2, 2, 2, 6, '#ffffffaa');
        px(0, 15, 16, 1, '#5aa8d8'); px(15, 0, 1, 16, '#5aa8d8');
      } else {
        px(0, 0, 16, 16, '#c88a4a'); px(1, 1, 14, 14, '#a8682e'); px(0, 7, 16, 2, '#c88a4a'); px(7, 0, 2, 16, '#c88a4a');
        ctx.strokeStyle = '#6a3a14'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
      }
      break;
    }
    case T.DOOR: {
      px(0, 0, 16, 16, '#565d75');
      for (let i = 1; i < 16; i += 4) px(i, 0, 2, 16, '#787f99');
      if (!level.solidAt(tx, ty - 1) || level.tile(tx, ty - 1) !== T.DOOR) { px(0, 0, 16, 3, '#ff4a5a'); }
      break;
    }
    case T.GATE: {
      px(0, 0, 16, 16, '#2a1f40');
      for (let i = 2; i < 16; i += 5) px(i, 0, 3, 16, '#8a5bff');
      px(0, 0, 16, 1, '#c9a8ff');
      break;
    }
  }
}

export class Renderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.assets = assets;
    this.chunks = new Map();
    this.bgCache = {};
    this.level = null;
    this.S = 1;
  }

  setLevel(level, theme) {
    this.level = level; this.theme = theme;
    this.chunks.clear();
    this.levelVersion = -1;
  }

  getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    const level = this.level;
    let c = this.chunks.get(key);
    if (c && !level.dirty.has(key)) return c;
    level.dirty.delete(key);
    if (!c) { c = document.createElement('canvas'); c.width = 512; c.height = 512; this.chunks.set(key, c); }
    const x = c.getContext('2d');
    x.clearRect(0, 0, 512, 512);
    x.imageSmoothingEnabled = false;
    for (let ty = cy * 32; ty < cy * 32 + 32 && ty < level.h; ty++) for (let tx = cx * 32; tx < cx * 32 + 32 && tx < level.w; tx++) {
      if (level.tiles[ty * level.w + tx]) drawTile(x, level, tx, ty, (tx - cx * 32) * 16, (ty - cy * 32) * 16, this.theme);
    }
    return c;
  }

  bgLayer(theme, layer) {
    const key = theme + layer + this.bgS;
    if (this.bgCache[key]) return this.bgCache[key];
    const W = 1024, H = 360, s = this.bgS;
    const c = document.createElement('canvas'); c.width = W * s; c.height = H * s;
    const x = c.getContext('2d'); x.scale(s, s);
    drawDeco(x, theme, layer, W, H, s);
    this.bgCache[key] = c;
    return c;
  }

  // ===== メイン描画 =====
  draw(g, alpha, viewW, viewH, S, t) {
    const ctx = this.ctx;
    this.S = S; this.bgS = Math.min(2, Math.max(1, Math.round(S)));
    const th = THEMES[this.theme];
    const p = g.player;
    let camX = g.cam.x, camY = g.cam.y;
    if (g.shakeA > 0) { camX += (Math.random() - 0.5) * g.shakeA; camY += (Math.random() - 0.5) * g.shakeA; }
    camX = Math.round(camX * S) / S; camY = Math.round(camY * S) / S;

    // 空
    ctx.setTransform(S, 0, 0, S, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, viewH);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, viewW, viewH);
    // 遠景・中景（横に繰り返す）
    for (const [layer, k, ky] of [['far', 0.18, 0.05], ['mid', 0.42, 0.12]]) {
      const gen = bgImage(this.assets.sprites || {}, this.theme, layer);
      if (!gen && layer === 'mid' && bgImage(this.assets.sprites || {}, this.theme, 'far')) continue; // 生成した遠景だけの時はコードの中景を重ねない
      const img = gen || this.bgLayer(this.theme, layer);
      const W = gen ? (gen.width / gen.height) * 360 : 1024;
      const ox = -((camX * k) % W);
      const oy = (viewH - 360) + (g.level.ph - viewH - camY) * ky;
      for (let x = ox - W; x < viewW; x += W) ctx.drawImage(img, x, oy + (layer === 'mid' ? 20 : 0), W, 360);
    }

    // ワールド
    ctx.setTransform(S, 0, 0, S, -camX * S, -camY * S);
    ctx.imageSmoothingEnabled = false;
    const cx0 = Math.floor(camX / 512), cx1 = Math.floor((camX + viewW) / 512);
    const cy0 = Math.floor(camY / 512), cy1 = Math.floor((camY + viewH) / 512);
    for (let cy = Math.max(0, cy0); cy <= cy1; cy++) for (let cx = Math.max(0, cx0); cx <= cx1; cx++) {
      ctx.drawImage(this.getChunk(cx, cy), cx * 512, cy * 512);
    }
    ctx.imageSmoothingEnabled = true;
    this.drawDynamicTiles(g, camX, camY, viewW, viewH, t);

    // エンティティ
    const floorY = g.arena ? g.arena.floor : 0;
    for (const e of g.entities) {
      if (e.x < camX - 120 || e.x > camX + viewW + 120) continue;
      if (e.type === 'platform') { drawPlatform(ctx, e, this.theme); continue; }
      if (e.type === 'fallrock') { drawFallRock(ctx, e, t, floorY || g.level.groundBelow(e.x, e.y) || 0); continue; }
      if (this.assets.sprites && drawEntitySprite(ctx, this.assets.sprites, e, t)) continue;
      const fn = ENTITY_ART[e.type];
      if (fn) fn(ctx, e, t);
    }
    if (g.boss && (g.bossStarted || !g.boss.under)) {
      const b = g.boss;
      if (!(b.dead && b.deadT > 2)) {
        ctx.save();
        if (b.dead) { ctx.globalAlpha = Math.max(0, 1 - b.deadT / 2); ctx.translate((Math.random() - 0.5) * 4, 0); }
        if (!(this.assets.sprites && drawBossSprite(ctx, this.assets.sprites, b, t, floorY))) BOSS_ART[b.id](ctx, b, t, floorY);
        ctx.restore();
      }
    }

    // プレイヤー
    if (!p.dead || g.deadT > 1.3) this.drawPlayer(g, p, alpha, t);

    // パーティクル
    for (const q of g.fx.parts) {
      const a = Math.max(0, q.life / q.max);
      ctx.globalAlpha = a;
      if (q.shape === 'circle') { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.5 - a * 0.5), 0, 7); ctx.fill(); }
      else if (q.shape === 'ring') { ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.stroke(); }
      else if (q.shape === 'star') star(ctx, q.x, q.y, q.size + 1, q.color);
      else if (q.shape === 'line') { ctx.strokeStyle = q.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.stroke(); }
      else { ctx.fillStyle = q.color; ctx.save(); ctx.translate(q.x, q.y); if (q.rot) ctx.rotate(q.rot); ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const tx of g.fx.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      ctx.font = `900 ${tx.size}px "M PLUS Rounded 1c", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = '#1b1b2e'; ctx.strokeText(tx.s, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.s, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    if (g.flashT > 0) { ctx.setTransform(S, 0, 0, S, 0, 0); ctx.fillStyle = `rgba(255,255,230,${g.flashT * 3})`; ctx.fillRect(0, 0, viewW, viewH); }
  }

  drawDynamicTiles(g, camX, camY, viewW, viewH, t) {
    const ctx = this.ctx, level = g.level;
    const tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(level.w - 1, Math.floor((camX + viewW) / TILE));
    const ty0 = Math.max(0, Math.floor(camY / TILE)), ty1 = Math.min(level.h - 1, Math.floor((camY + viewH) / TILE));
    // 溶岩の表面
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * level.w + tx;
      if (level.tiles[i] === T.LAVA && level.tile(tx, ty - 1) !== T.LAVA) {
        const x = tx * TILE, y = ty * TILE;
        ctx.fillStyle = '#ffd23f';
        for (let k = 0; k < 16; k += 2) { const h = 2 + Math.sin(t * 5 + (tx * 16 + k) * 0.4) * 1.5; ctx.fillRect(x + k, y - h + 2, 2, h + 1); }
        ctx.fillStyle = 'rgba(255,120,20,0.25)'; ctx.fillRect(x, y - 10, 16, 10);
      }
    }
    // 強制区間
    const zoneCol = { 1: '#36c8ff', 2: '#8a8fa8', 3: '#9fe8ff', 4: '#ffffff', 5: '#ff8a2a', 6: '#ff4a5a', 7: '#5ad87a', 8: '#ffffff', 9: '#c87a3a' };
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const z = level.zones[ty * level.w + tx];
      if (!z) continue;
      const x = tx * TILE, y = ty * TILE;
      ctx.fillStyle = zoneCol[z] + '30'; ctx.fillRect(x, y, 16, 16);
      const edge = (dx, dy) => level.zones[(ty + dy) * level.w + tx + dx] !== z;
      ctx.fillStyle = zoneCol[z] + 'cc';
      const a = 0.5 + 0.5 * Math.sin(t * 6 + tx * 0.5);
      ctx.globalAlpha = a;
      if (edge(-1, 0)) ctx.fillRect(x, y, 2, 16);
      if (edge(1, 0)) ctx.fillRect(x + 14, y, 2, 16);
      if (edge(0, -1)) ctx.fillRect(x, y, 16, 2);
      if (edge(0, 1)) ctx.fillRect(x, y + 14, 16, 2);
      ctx.globalAlpha = 1;
      if ((tx + ty * 3) % 7 === 0 && (edge(-1, 0) || edge(1, 0))) {
        const def = g.balls[ZONE_BALL[z]];
        drawBallSprite(ctx, this.assets, { ...def, r: 5, halfLen: def.halfLen ? 3 : 0 }, x + 8, y + 8, 0, 1, 1, 0.8);
      }
    }
    // 磁石に引かれている
    if (g.magnetPull) {
      ctx.strokeStyle = 'rgba(255,90,110,0.7)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.player.x, g.player.y); ctx.lineTo(g.magnetPull.x, g.magnetPull.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  drawPlayer(g, p, alpha, t) {
    const ctx = this.ctx;
    const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha;
    const d = p.def;
    // 被弾中は点滅
    if (p.invuln > 0 && Math.floor(t * 20) % 2 === 0) return;
    let sx = 1, sy = 1, oy = 0;
    if (p.squash > 0.02 && !d.capsule) {
      const s = p.squash;
      const n = p.groundN || { nx: 0, ny: -1 };
      if (Math.abs(n.ny) > 0.5) { sx = 1 + s * 0.28; sy = 1 - s * 0.28; oy = d.r * s * 0.28; }
      else { sx = 1 - s * 0.25; sy = 1 + s * 0.25; }
    }
    if (p.stuck) { const s = p.stuck; if (Math.abs(s.ny) > 0.5) { sx = 1.18; sy = 0.82; oy = d.r * 0.18 * -Math.sign(s.ny); } else { sx = 0.82; sy = 1.18; } }
    if (p.morphT > 0) { const k = 1 + Math.sin((p.morphT / 0.25) * Math.PI) * 0.25; sx *= k; sy *= k; }
    // 影
    const gy = g.level.groundBelow(x, y);
    if (gy != null && gy - y < 200) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      const k = 1 - (gy - y) / 260;
      ctx.beginPath(); ctx.ellipse(x, gy - 1, d.r * k, d.r * 0.25 * k, 0, 0, 7); ctx.fill();
    }
    // 吸い付き・発光
    if (d.id === 'fire') { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 20); circ(ctx, x, y, d.r + 6, 'rgba(255,140,0,0.5)', null); ctx.restore(); }
    drawBallSprite(ctx, this.assets, d, x, y + oy, d.capsule ? p.angle : p.angle, sx, sy);
    // 反発チャージのゲージ
    if ((d.kind === 'bounce') && p.mult > 0.75) {
      const k = (p.mult - 0.72) / (1.2 - 0.72);
      ctx.strokeStyle = k >= 0.99 ? '#ffe14d' : 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, d.hitR + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
    } else if (p.mult < 0.6 && d.kind === 'bounce') {
      ctx.fillStyle = '#7dd3ff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼', x, y - d.hitR - 4);
    }
    if (p.queue && !p.queue.forced) {
      const qd = g.balls[p.queue.id];
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 20);
      drawBallSprite(ctx, this.assets, { ...qd, r: 6, halfLen: qd.halfLen ? 4 : 0 }, x + d.hitR + 6, y - d.hitR - 6, 0);
      ctx.globalAlpha = 1;
    }
    if (p.denyT > 0) { ctx.strokeStyle = `rgba(255,70,70,${p.denyT * 3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, d.hitR + 3, 0, 7); ctx.stroke(); }
  }
}
