import { TILE, T, SOLID_TYPES } from './consts.js';

// ステージを組み立てるためのキャンバス。座標はタイル単位（x→右, y→下）。
export class Builder {
  constructor(h) {
    this.h = h;
    this.rows = Array.from({ length: h }, () => []);
    this.extra = [];
    this.zoneRects = [];
  }
  get width() { return Math.max(...this.rows.map((r) => r.length)); }
  set(x, y, ch) {
    if (y < 0 || y >= this.h || x < 0) return this;
    const r = this.rows[y];
    while (r.length <= x) r.push(' ');
    r[x] = ch;
    return this;
  }
  get(x, y) { return (this.rows[y] && this.rows[y][x]) || ' '; }
  fill(x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
    return this;
  }
  // x0..x1 の地面（top 行から最下段まで）
  ground(x0, x1, top, ch = '#') { return this.fill(x0, top, x1, this.h - 1, ch); }
  row(x0, x1, y, ch) { return this.fill(x0, y, x1, y, ch); }
  col(x, y0, y1, ch) { return this.fill(x, y0, x, y1, ch); }
  clear(x0, y0, x1, y1) { return this.fill(x0, y0, x1, y1, ' '); }
  // 文字列の配列を貼り付ける（空白は透過、'.' は空白で上書き）
  stamp(x, y, lines) {
    lines.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) {
        const c = line[dx];
        if (c === ' ') continue;
        this.set(x + dx, y + dy, c === '.' ? ' ' : c);
      }
    });
    return this;
  }
  // 強制区間（タイルとは別レイヤー。壊れる床と重ねられる）
  zone(x0, y0, x1, y1, n) { this.zoneRects.push([x0, y0, x1, y1, n]); return this; }
  // 追加のエンティティ（文字で表せないもの）
  add(obj) { this.extra.push(obj); return this; }
  toRows() {
    const w = this.width;
    return this.rows.map((r) => r.join('').padEnd(w, ' '));
  }
}

const TILE_CHARS = {
  '#': T.SOLID, '=': T.BRICK, '-': T.ONEWAY, '^': T.SPIKE, 'L': T.LAVA, 'I': T.ICE,
  'M': T.MAGNET, 'H': T.HEAVY, 'B': T.MELT, 'D': T.DOOR,
};

export class Level {
  constructor(stage) {
    const rows = stage.rows;
    this.stage = stage;
    this.h = rows.length;
    this.w = Math.max(...rows.map((r) => r.length));
    this.pw = this.w * TILE;
    this.ph = this.h * TILE;
    this.tiles = new Uint8Array(this.w * this.h);
    this.zones = new Uint8Array(this.w * this.h);
    this.gates = [];
    this.spawns = [];
    this.dirty = new Set();
    this.version = 0;
    for (let y = 0; y < this.h; y++) {
      const r = rows[y];
      for (let x = 0; x < this.w; x++) {
        const ch = r[x] || ' ';
        const i = y * this.w + x;
        if (TILE_CHARS[ch] !== undefined) this.tiles[i] = TILE_CHARS[ch];
        else if (ch >= '1' && ch <= '9') this.zones[i] = ch.charCodeAt(0) - 48;
        else if (ch === '!') this.gates.push({ x, y });
        else if (ch !== ' ') this.spawns.push({ ch, x, y });
      }
    }
    for (const e of stage.extra || []) this.spawns.push(e);
    for (const [x0, y0, x1, y1, n] of stage.zones || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.zones[y * this.w + x] = n;
    this.doorGroups = this.findGroups(T.DOOR);
  }

  idx(x, y) { return y * this.w + x; }
  tile(x, y) {
    if (x < 0 || x >= this.w) return T.SOLID; // 左右端は壁
    if (y >= this.h) return T.EMPTY;
    if (y < 0) return SOLID_TYPES.has(this.tiles[x]) ? T.SOLID : T.EMPTY; // 最上段の壁は上へ続く
    return this.tiles[y * this.w + x];
  }
  solidAt(x, y) { return SOLID_TYPES.has(this.tile(x, y)); }
  zoneAt(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return 0;
    return this.zones[y * this.w + x];
  }
  setTile(x, y, t) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.tiles[y * this.w + x] = t;
    this.dirty.add(`${Math.floor(x / 32)},${Math.floor(y / 32)}`);
    this.version++;
  }

  // 4 近傍でつながった同種タイルの塊
  floodGroup(x0, y0, type) {
    const out = [];
    const seen = new Set();
    const st = [[x0, y0]];
    while (st.length) {
      const [x, y] = st.pop();
      const k = y * this.w + x;
      if (seen.has(k) || this.tile(x, y) !== type || x < 0 || x >= this.w) continue;
      seen.add(k);
      out.push({ x, y });
      st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return out;
  }
  findGroups(type) {
    const groups = [];
    const seen = new Set();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.tiles[y * this.w + x] !== type || seen.has(y * this.w + x)) continue;
      const g = this.floodGroup(x, y, type);
      g.forEach((c) => seen.add(c.y * this.w + c.x));
      const cx = g.reduce((s, c) => s + c.x, 0) / g.length;
      const cy = g.reduce((s, c) => s + c.y, 0) / g.length;
      groups.push({ cells: g, cx, cy, open: false });
    }
    return groups;
  }
  removeGroup(x, y, type) {
    const g = this.floodGroup(x, y, type);
    for (const c of g) this.setTile(c.x, c.y, T.EMPTY);
    return g;
  }
  setGates(closed) {
    for (const g of this.gates) this.setTile(g.x, g.y, closed ? T.GATE : T.EMPTY);
  }
  // 地面の上端（px）を探す：x 列で y 以下の最初の固体
  groundBelow(px, py) {
    const x = Math.floor(px / TILE);
    for (let y = Math.max(0, Math.floor(py / TILE)); y < this.h; y++) if (this.solidAt(x, y)) return y * TILE;
    return null;
  }
}
