import { TILE, T, SOLID_TYPES, clamp } from './consts.js';

// ボールの形状を円の列で表す（円＝1個、ラグビー球＝軸上に並べた5個＝カプセル近似）
export function shapeCircles(x, y, def, angle = 0) {
  if (!def.halfLen) return [[x, y, def.r]];
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const out = [];
  for (let i = 0; i < 5; i++) {
    const t = -1 + i / 2;
    out.push([x + ca * t * def.halfLen, y + sa * t * def.halfLen, def.r]);
  }
  return out;
}

function solidOrOneway(t) { return SOLID_TYPES.has(t) || t === T.ONEWAY; }

// 円の列とタイル・動く固体の最も深い接触を探す
// opts: { vy, prevBottom, ignoreOneway }
export function deepestContact(level, circles, boxes, opts = {}) {
  let best = null;
  for (let ci = 0; ci < circles.length; ci++) {
    const [cx, cy, r] = circles[ci];
    const tx0 = Math.floor((cx - r) / TILE), tx1 = Math.floor((cx + r) / TILE);
    const ty0 = Math.floor((cy - r) / TILE), ty1 = Math.floor((cy + r) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const t = level.tile(tx, ty);
      if (!solidOrOneway(t)) continue;
      const rx = tx * TILE, ry = ty * TILE;
      const c = rectContact(cx, cy, r, rx, ry, TILE, TILE, (dx, dy) => level.solidAt(tx + dx, ty + dy));
      if (!c) continue;
      if (t === T.ONEWAY) {
        if (opts.ignoreOneway || c.ny > -0.7 || (opts.vy ?? 0) < 0) continue;
        if ((opts.prevBottom ?? -1e9) > ry + 3 + (opts.vy ?? 0) * (1 / 60)) continue;
      }
      if (!best || c.pen > best.pen) { best = c; c.type = t; c.tx = tx; c.ty = ty; c.ci = ci; }
    }
    if (boxes) for (const b of boxes) {
      if (b.solid === false) continue;
      const c = rectContact(cx, cy, r, b.x, b.y, b.w, b.h, null);
      if (!c) continue;
      if (b.oneway && (c.ny > -0.7 || (opts.vy ?? 0) < (b.vy || 0) - 1 || (opts.prevBottom ?? -1e9) > b.y + 4 + Math.abs(b.vy || 0) / 60)) continue;
      if (!best || c.pen > best.pen) { best = c; c.type = b.tileType ?? T.SOLID; c.box = b; c.ci = ci; }
    }
  }
  return best;
}

// 円と矩形の接触。neighborSolid(dx,dy) があれば内部エッジ（隣接タイルの継ぎ目）で引っかからないようにする
function rectContact(cx, cy, r, rx, ry, rw, rh, neighborSolid) {
  const qx = clamp(cx, rx, rx + rw), qy = clamp(cy, ry, ry + rh);
  const dx = cx - qx, dy = cy - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  let nx, ny, pen;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    nx = dx / d; ny = dy / d; pen = r - d;
    if (neighborSolid) {
      // 角の法線が隣接固体の方向を向いていれば、その成分を落として軸方向にする
      const sx = Math.sign(nx), sy = Math.sign(ny);
      const hx = sx && neighborSolid(sx, 0), hy = sy && neighborSolid(0, sy);
      if (hx && hy) return null;
      if (hx) { nx = 0; ny = sy; pen = r - Math.abs(dy); }
      else if (hy) { ny = 0; nx = sx; pen = r - Math.abs(dx); }
    }
  } else {
    // 中心が矩形内：最短の面へ押し出す（隣が固体の面は除外）
    const cands = [
      [cx - rx, -1, 0], [rx + rw - cx, 1, 0], [cy - ry, 0, -1], [ry + rh - cy, 0, 1],
    ];
    let bestc = null;
    for (const [d, ax, ay] of cands) {
      if (neighborSolid && neighborSolid(ax, ay)) continue;
      if (!bestc || d < bestc[0]) bestc = [d, ax, ay];
    }
    if (!bestc) bestc = [cy - ry, 0, -1];
    nx = bestc[1]; ny = bestc[2]; pen = bestc[0] + r;
  }
  if (pen <= 0) return null;
  return { nx, ny, pen, px: qx, py: qy };
}

export function shapeFree(level, circles, boxes, tol = 0.5) {
  const c = deepestContact(level, circles, boxes, { ignoreOneway: true });
  return !c || c.pen <= tol;
}

// from → to の直線上を、旧形状で通れるか（押し出しで壁を抜けないため）
export function pathFree(level, def, angle, x0, y0, x1, y1, boxes) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / 3));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const circles = shapeCircles(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, def, angle);
    if (!shapeFree(level, circles, boxes, 1)) return false;
  }
  return true;
}

// 位置の押し出し。onContact(c) が true を返したら（壊した等）その接触は押し出さない
export function resolve(level, body, def, boxes, opts, onContact) {
  const contacts = [];
  for (let it = 0; it < 8; it++) {
    const circles = shapeCircles(body.x, body.y, def, body.angle);
    const c = deepestContact(level, circles, boxes, opts);
    if (!c) break;
    if (onContact && onContact(c)) continue;
    body.x += c.nx * (c.pen + 0.01);
    body.y += c.ny * (c.pen + 0.01);
    contacts.push(c);
    if (it === 7) body.crushed = true;
  }
  return contacts;
}

// 円と AABB の重なり（エンティティとの当たり判定用）。法線は箱→円
export function circleBox(cx, cy, r, bx, by, bw, bh) {
  const qx = clamp(cx, bx, bx + bw), qy = clamp(cy, by, by + bh);
  const dx = cx - qx, dy = cy - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 1e-8) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, pen: r - d }; }
  const mx = cx - (bx + bw / 2), my = cy - (by + bh / 2);
  if (Math.abs(mx) / bw > Math.abs(my) / bh) return { nx: Math.sign(mx) || 1, ny: 0, pen: r };
  return { nx: 0, ny: Math.sign(my) || -1, pen: r };
}

export function circleCircle(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  const d2 = dx * dx + dy * dy, rr = ar + br;
  if (d2 >= rr * rr) return null;
  const d = Math.sqrt(d2) || 1;
  return { nx: dx / d, ny: dy / d, pen: rr - d };
}
