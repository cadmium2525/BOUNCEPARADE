import { TILE, T, GRAVITY, STOMP_MIN_VY, clamp, sign } from './consts.js';
import { circleBox, circleCircle } from './physics.js';

// ===== 共通 =====
export class Entity {
  constructor(x, y) { this.x = x; this.y = y; this.alive = true; this.t = 0; this.w = 16; this.h = 16; }
  get left() { return this.x - this.w / 2; }
  get top() { return this.y - this.h / 2; }
  overlap(p) { return circleBox(p.x, p.y, p.r, this.left, this.top, this.w, this.h); }
  update(dt) { this.t += dt; }
}

// 床の上に置く（タイル底辺に足をそろえる）
const floorY = (ty, h) => (ty + 1) * TILE - h / 2;

function stompSpeed(p) {
  const d = p.def;
  return Math.max(STOMP_MIN_VY, d.kind === 'bounce' ? d.bounceV * p.mult : 0);
}

function isStomp(p, c) { return c.ny < -0.45 && p.vy > -60; }

// ===== アイテム =====
export class Coin extends Entity {
  constructor(x, y) { super(x, y); this.type = 'coin'; this.r = 6; this.w = 12; this.h = 12; this.phase = Math.random() * 6; }
  touch(p, c, g) { this.alive = false; g.collectCoin(this); }
}

export class Heart extends Entity {
  constructor(x, y) { super(x, y); this.type = 'heart'; this.w = 14; this.h = 14; }
  touch(p, c, g) { if (p.hp >= p.maxHp) return; this.alive = false; p.hp++; g.fx.text(this.x, this.y, '+1', '#ff5b7a'); g.sfx('heart'); }
}

export class Checkpoint extends Entity {
  constructor(x, y) { super(x, y); this.type = 'checkpoint'; this.w = 14; this.h = 40; this.y = y - 12; this.on = false; }
  touch(p, c, g) { if (this.on) return; this.on = true; g.setCheckpoint(this); }
}

export class Goal extends Entity {
  constructor(x, y) { super(x, y); this.type = 'goal'; this.w = 24; this.h = 400; this.y = y + 8 - 200; this.baseY = y + 8; }
  touch(p, c, g) { g.reachGoal(this); }
}

// 看板：近づくとヒントを表示
export class Sign extends Entity {
  constructor(x, y, text) { super(x, y); this.type = 'sign'; this.text = text; this.w = 16; this.h = 16; this.y = (Math.floor(y / TILE) + 1) * TILE - 10; }
}

// ===== ギミック =====
export class Spring extends Entity {
  constructor(x, y) { super(x, y); this.type = 'spring'; this.w = 16; this.h = 10; this.y = (Math.floor(y / TILE) + 1) * TILE - 5; this.anim = 0; this.power = 820; }
  update(dt) { super.update(dt); this.anim = Math.max(0, this.anim - dt * 4); }
  touch(p, c, g) {
    if (c.ny < -0.3 && p.vy > -200) { p.launchUp(this.power); this.anim = 1; g.sfx('spring'); g.fx.burst(this.x, this.top, 6, '#ffe36e'); }
  }
}

export class Bumper extends Entity {
  constructor(x, y, r = 12) { super(x, y); this.type = 'bumper'; this.r = r; this.w = r * 2; this.h = r * 2; this.anim = 0; }
  overlap(p) { return circleCircle(p.x, p.y, p.r, this.x, this.y, this.r); }
  update(dt) { super.update(dt); this.anim = Math.max(0, this.anim - dt * 5); }
  touch(p, c, g) {
    const v = 560;
    p.stuck = null; p.magnetStuck = null;
    p.x += c.nx * c.pen; p.y += c.ny * c.pen;
    p.vx = c.nx * v; p.vy = c.ny * v - 60;
    if (p.def.capsule) p.av += (Math.random() - 0.5) * 12;
    p.launchT = 0.25;
    this.anim = 1;
    g.sfx('bumper'); g.addScore(10, this.x, this.y - this.r);
  }
}

export class Launcher extends Entity {
  constructor(x, y, dir) {
    super(x, y); this.type = 'launcher';
    this.dirX = dir === '>' ? 1 : dir === '<' ? -1 : 0;
    this.dirY = dir === 'A' ? -1 : 0;
    this.power = dir === 'A' ? 1000 : 700;
    this.w = 16; this.h = 16; this.anim = 0;
    this.cx = x; this.cy = y;
  }
  update(dt) { super.update(dt); this.anim = Math.max(0, this.anim - dt * 3); }
  overlap(p) {
    const dx = p.x - this.x, dy = p.y - this.y;
    return dx * dx + dy * dy < 11 * 11 ? { nx: 0, ny: -1, pen: 1 } : null;
  }
  touch(p, c, g) {
    if (p.captured || p.launcherCd > 0) return;
    p.captured = this; this.holdT = 0.28; this.anim = 1;
    p.stuck = null; p.magnetStuck = null;
    g.sfx('capture');
  }
}

export class Switch extends Entity {
  constructor(x, y, heavy) {
    super(x, y); this.type = 'switch'; this.heavy = heavy;
    this.w = 16; this.h = 7; this.y = (Math.floor(y / TILE) + 1) * TILE - 3.5;
    this.pressed = false; this.recharge = 0; this.reusable = false;
  }
  update(dt) { super.update(dt); if (this.recharge > 0) { this.recharge -= dt; if (this.recharge <= 0) this.pressed = false; } }
  touch(p, c, g) {
    if (this.pressed || c.ny > -0.3) return;
    if (this.heavy && !p.def.heavy) { if (!this._hint) { g.fx.text(this.x, this.y - 18, '重さが足りない', '#fff'); this._hint = 1.5; g.sfx('thud'); } return; }
    this.pressed = true;
    if (this.reusable) this.recharge = this.rechargeTime || 4;
    g.sfx('switch');
    if (this.onPress) this.onPress(g, p);
    else g.openNearestDoor(this);
  }
}

// 送風機：風の領域を作る
export class Fan extends Entity {
  constructor(x, y, dir, level) {
    super(x, y); this.type = 'fan'; this.dir = dir;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    this.on = true;
    if (dir === 'u') {
      let len = 0; while (len < 14 && !level.solidAt(tx, ty - 1 - len)) len++;
      this.area = { x: (tx - 1) * TILE, y: (ty - len) * TILE, w: 3 * TILE, h: len * TILE };
      this.fx = 0; this.fy = -2600;
    } else {
      const s = dir === 'r' ? 1 : -1;
      let len = 0; while (len < 16 && !level.solidAt(tx + s * (1 + len), ty)) len++;
      this.area = s > 0 ? { x: (tx + 1) * TILE, y: (ty - 1) * TILE, w: len * TILE, h: 3 * TILE } : { x: (tx - len) * TILE, y: (ty - 1) * TILE, w: len * TILE, h: 3 * TILE };
      this.fx = s * 1100; this.fy = 0;
    }
    this.solid = true;
  }
  windAt(px, py) {
    if (!this.on) return null;
    const a = this.area;
    if (px < a.x || px > a.x + a.w || py < a.y || py > a.y + a.h) return null;
    const dist = this.dir === 'u' ? (this.y - py) / (a.h + 8) : Math.abs(px - this.x) / (a.w + 8);
    const k = 1 - clamp(dist, 0, 1) * 0.4;
    return { x: this.fx * k, y: this.fy * k };
  }
}

// 天井からのプレス機（固体の箱）
export class Press extends Entity {
  constructor(x, y, level) {
    super(x, y); this.type = 'press';
    const tx = Math.floor(x / TILE);
    let top = Math.floor(y / TILE); while (top > 0 && !level.solidAt(tx, top - 1)) top--;
    let bot = Math.floor(y / TILE); while (bot < level.h - 1 && !level.solidAt(tx, bot + 1)) bot++;
    this.w = 40; this.h = 28;
    this.topY = top * TILE + this.h / 2 + 8;
    this.botY = (bot + 1) * TILE - this.h / 2;
    this.y = this.topY; this.state = 'up'; this.timer = 1 + (tx % 3) * 0.4;
    this.box = { x: 0, y: 0, w: this.w, h: this.h, vy: 0, solid: true, carries: true, dx: 0, dy: 0, press: this };
    this.syncBox(0);
  }
  syncBox(dy) { const b = this.box; b.x = this.left; b.y = this.top; b.dx = 0; b.dy = dy; b.vy = dy * 60; }
  update(dt, g) {
    super.update(dt);
    const oy = this.y;
    this.timer -= dt;
    if (this.state === 'up' && this.timer <= 0) { this.state = 'warn'; this.timer = 0.45; }
    else if (this.state === 'warn' && this.timer <= 0) { this.state = 'down'; }
    else if (this.state === 'down') {
      this.y = Math.min(this.botY, this.y + 700 * dt);
      if (this.y >= this.botY) { this.state = 'hold'; this.timer = 0.6; g.sfx('press'); g.shake(4); g.fx.dust(this.x, this.botY + this.h / 2, 10); }
    } else if (this.state === 'hold' && this.timer <= 0) this.state = 'rise';
    else if (this.state === 'rise') {
      this.y = Math.max(this.topY, this.y - 90 * dt);
      if (this.y <= this.topY) { this.state = 'up'; this.timer = 1.4; }
    }
    this.syncBox(this.y - oy);
    // プレスに挟まれた敵
    if (this.state === 'down') for (const e of g.entities) if (e.enemy && e.alive && Math.abs(e.x - this.x) < this.w / 2 + e.w / 2 - 4 && e.top < this.top + this.h + 2 && e.y > this.y) e.defeat(g, 'press');
  }
  hitsPlayerFromAbove(p) {
    return this.state === 'down' && p.y > this.y && Math.abs(p.x - this.x) < this.w / 2 + p.r - 4 && p.y - p.r < this.top + this.h + 3;
  }
}

// 動く床
export class Platform extends Entity {
  constructor(x, y, axis, range = 4, speed = 1, wTiles = 3, phase = 0) {
    super(x, y); this.type = 'platform'; this.axis = axis;
    this.w = wTiles * TILE; this.h = 10;
    this.ox = x; this.oy = y - 3; this.range = range * TILE; this.speed = speed; this.phase = phase;
    this.box = { x: 0, y: 0, w: this.w, h: this.h, solid: true, oneway: true, carries: true, dx: 0, dy: 0, vy: 0 };
    this.place(0);
  }
  place(dt) {
    const s = Math.sin(this.t * this.speed + this.phase);
    const nx = this.axis === 'x' ? this.ox + s * this.range : this.ox;
    const ny = this.axis === 'y' ? this.oy + s * this.range : this.oy;
    const b = this.box;
    b.dx = nx - this.x; b.dy = ny - this.y; b.vy = dt ? b.dy / dt : 0;
    this.x = nx; this.y = ny;
    b.x = this.left; b.y = this.top;
  }
  update(dt) { super.update(dt); this.place(dt); }
}

// ===== 敵 =====
export class Enemy extends Entity {
  constructor(x, y) { super(x, y); this.enemy = true; this.dir = -1; this.state = 'Patrol'; this.flash = 0; }
  defeat(g, how) {
    if (!this.alive || this.state === 'Defeated') return;
    this.alive = false; this.state = 'Defeated';
    g.onEnemyDefeated(this, how);
  }
  // 地上を巡回（壁と崖で折り返す）
  walk(dt, g, speed) {
    const level = g.level;
    const nx = this.x + this.dir * speed * dt;
    const front = nx + this.dir * this.w / 2;
    const tx = Math.floor(front / TILE);
    const tyTop = Math.floor((this.top + 2) / TILE), tyBot = Math.floor((this.top + this.h - 2) / TILE);
    let blocked = false;
    for (let ty = tyTop; ty <= tyBot; ty++) if (level.solidAt(tx, ty)) blocked = true;
    const below = Math.floor((this.top + this.h + 2) / TILE);
    const ledge = !level.solidAt(tx, below);
    if (blocked || ledge) this.dir *= -1; else this.x = nx;
  }
  update(dt, g) { super.update(dt); this.flash = Math.max(0, this.flash - dt); }
}

export class Korobot extends Enemy {
  constructor(x, y) { super(x, y); this.type = 'korobot'; this.w = 26; this.h = 22; this.y = floorY(Math.floor(y / TILE), this.h); }
  update(dt, g) { super.update(dt, g); this.walk(dt, g, 42); }
  touch(p, c, g) {
    if (p.def.spiky || (p.def.heavy && p.speed > 160)) return this.defeat(g, 'heavy');
    if (isStomp(p, c)) { p.launchUp(stompSpeed(p)); return this.defeat(g, 'stomp'); }
    p.hurt(c.nx, c.ny, 'enemy');
  }
}

export class Gachigachi extends Enemy {
  constructor(x, y) { super(x, y); this.type = 'gachigachi'; this.w = 30; this.h = 26; this.y = floorY(Math.floor(y / TILE), this.h); }
  update(dt, g) { super.update(dt, g); this.walk(dt, g, 22); }
  touch(p, c, g) {
    if (p.def.spiky || (p.def.heavy && p.speed > 200)) { g.shake(5); return this.defeat(g, 'heavy'); }
    if (isStomp(p, c)) { p.launchUp(640); this.flash = 0.15; g.sfx('armor'); return; } // 装甲はジャンプ台
    if (p.def.heavy) { p.x += c.nx * c.pen; p.vx = c.nx * 80; g.sfx('armor'); return; }
    p.hurt(c.nx, c.ny, 'enemy');
  }
}

export class Fuwadrone extends Enemy {
  constructor(x, y) { super(x, y); this.type = 'fuwadrone'; this.w = 26; this.h = 18; this.ox = x; this.oy = y; this.phase = Math.random() * 6; }
  update(dt, g) {
    super.update(dt, g);
    this.x = this.ox + Math.sin(this.t * 0.9 + this.phase) * 56;
    this.y = this.oy + Math.sin(this.t * 2.6 + this.phase) * 8;
    this.dir = Math.cos(this.t * 0.9 + this.phase) >= 0 ? 1 : -1;
  }
  touch(p, c, g) {
    if (p.def.spiky || (p.def.heavy && p.speed > 160)) return this.defeat(g, 'heavy');
    if (isStomp(p, c)) { p.launchUp(stompSpeed(p)); return this.defeat(g, 'stomp'); }
    p.hurt(c.nx, c.ny, 'enemy');
  }
}

export class Purun extends Enemy {
  constructor(x, y) { super(x, y); this.type = 'purun'; this.w = 30; this.h = 22; this.y = floorY(Math.floor(y / TILE), this.h); this.wob = 0; }
  update(dt, g) { super.update(dt, g); this.wob = Math.max(0, this.wob - dt * 2.5); }
  touch(p, c, g) {
    this.wob = 1;
    g.sfx('purun');
    if (c.ny < -0.3) { p.launchUp(760); return; }
    p.x += c.nx * c.pen; p.y += c.ny * c.pen;
    p.vx = sign(c.nx || 1) * 380; p.vy = -260;
  }
  defeat() {} // 倒せない
}

export class Togemaru extends Enemy {
  constructor(x, y) { super(x, y); this.type = 'togemaru'; this.w = 24; this.h = 24; this.y = floorY(Math.floor(y / TILE), this.h); this.roll = 0; }
  update(dt, g) { super.update(dt, g); this.walk(dt, g, 34); this.roll += this.dir * 34 * dt / 12; }
  overlap(p) { return circleCircle(p.x, p.y, p.r, this.x, this.y, 11); }
  touch(p, c, g) {
    if (p.def.spiky) return this.defeat(g, 'heavy');
    p.hurt(c.nx, c.ny, 'spike');
  }
}

export class Ponpon extends Enemy {
  constructor(x, y, dir) {
    super(x, y); this.type = 'ponpon'; this.dir = dir; this.w = 28; this.h = 26;
    this.y = floorY(Math.floor(y / TILE), this.h); this.cool = 1.2 + Math.random(); this.state = 'Idle'; this.windup = 0;
  }
  update(dt, g) {
    super.update(dt, g);
    const p = g.player;
    const dx = p.x - this.x;
    const inRange = Math.abs(dx) < 330 && Math.abs(p.y - this.y) < 150 && sign(dx) === this.dir;
    if (this.state === 'Idle') { this.cool -= dt; if (this.cool <= 0 && inRange) { this.state = 'Windup'; this.windup = 0.5; } }
    else if (this.state === 'Windup') {
      this.windup -= dt;
      if (this.windup <= 0) {
        g.spawn(new Bullet(this.x + this.dir * 16, this.y - 4, this.dir * 170, 0, this));
        g.sfx('cannon');
        this.state = 'Idle'; this.cool = 2.2;
      }
    }
  }
  touch(p, c, g) {
    if (p.def.spiky || (p.def.heavy && p.speed > 200)) return this.defeat(g, 'heavy');
    // 砲台は固い：踏むと跳ね返る、横からは押し返す
    if (isStomp(p, c)) { p.launchUp(Math.max(420, stompSpeed(p) * 0.8)); g.sfx('armor'); return; }
    p.x += c.nx * c.pen; p.y += c.ny * c.pen;
    const vn = p.vx * c.nx + p.vy * c.ny;
    if (vn < 0) { p.vx -= 1.4 * vn * c.nx; p.vy -= 1.4 * vn * c.ny; }
  }
}

// 弾（ポンポン砲・ボス）。反射されると敵に当たる
export class Bullet extends Entity {
  constructor(x, y, vx, vy, owner, opts = {}) {
    super(x, y); this.type = 'bullet'; this.vx = vx; this.vy = vy; this.owner = owner;
    this.r = opts.r || 6; this.w = this.r * 2; this.h = this.r * 2;
    this.gravity = opts.gravity || 0; this.kind = opts.kind || 'ball'; this.life = opts.life || 6;
    this.reflected = false; this.reflectable = opts.reflectable !== false;
  }
  overlap(p) { return circleCircle(p.x, p.y, p.r, this.x, this.y, this.r); }
  update(dt, g) {
    super.update(dt);
    this.vy += this.gravity * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || g.level.solidAt(Math.floor(this.x / TILE), Math.floor(this.y / TILE))) { this.alive = false; g.fx.burst(this.x, this.y, 5, '#ccc'); return; }
    if (this.reflected) {
      for (const e of g.entities) {
        if (!e.enemy || !e.alive || e === this || e.type === 'purun') continue;
        if (circleBox(this.x, this.y, this.r, e.left, e.top, e.w, e.h)) { e.defeat(g, 'reflect'); this.alive = false; return; }
      }
      if (g.boss && g.boss.hitByBullet && g.boss.hitByBullet(this, g)) { this.alive = false; }
    }
  }
  touch(p, c, g) {
    if (this.reflected) return;
    const d = p.def;
    const toward = (p.vx * -c.nx + p.vy * -c.ny);
    if (this.reflectable && (d.reflect || (d.kind === 'bounce' && c.ny < -0.4 && p.vy > 0) || (d.kind === 'bounce' && toward > 180))) {
      const sp = Math.max(260, Math.hypot(this.vx, this.vy) * 1.4);
      this.vx = -c.nx * sp; this.vy = -c.ny * sp * 0.6 - (this.gravity ? 200 : 0);
      if (Math.abs(this.vx) < 120) this.vx = sign(this.vx || -this.owner?.dir || 1) * 200;
      this.reflected = true; this.gravity = 0; this.life = 3;
      g.sfx('reflect'); g.fx.burst(this.x, this.y, 8, '#fff');
      return;
    }
    if (d.heavy) { this.alive = false; g.fx.burst(this.x, this.y, 6, '#bbb'); g.sfx('armor'); return; }
    this.alive = false;
    p.hurt(-c.nx, -c.ny, 'bullet');
  }
}

// 危険な柱・衝撃波など（ボスが作る）：触れると被弾
export class Hazard extends Entity {
  constructor(x, y, w, h, life, opts = {}) {
    super(x, y); this.type = 'hazard'; this.w = w; this.h = h; this.life = life; this.kind = opts.kind || 'bolt'; this.vx = opts.vx || 0; this.warn = opts.warn || 0;
  }
  update(dt, g) {
    super.update(dt);
    if (this.warn > 0) { this.warn -= dt; return; }
    this.life -= dt; this.x += this.vx * dt;
    if (this.life <= 0) this.alive = false;
    if (this.vx && g.level.solidAt(Math.floor((this.x + Math.sign(this.vx) * this.w / 2) / TILE), Math.floor(this.y / TILE))) this.alive = false;
  }
  overlap(p) { return this.warn > 0 ? null : super.overlap(p); }
  touch(p, c, g) { p.hurt(c.nx, c.ny, this.kind); }
}

// ボスが作る一時的な足場（氷柱など）
export class Pillar extends Entity {
  constructor(x, floorPx, hTiles, life, kind = 'ice') {
    super(x, floorPx); this.type = 'pillar'; this.kind = kind;
    this.w = 32; this.fullH = hTiles * TILE; this.h = 2; this.floorPx = floorPx; this.life = life; this.grow = 0;
    this.box = { x: 0, y: 0, w: this.w, h: 2, solid: true, carries: true, dx: 0, dy: 0, vy: 0, noStick: false };
    this.sync(0);
  }
  sync(dy) { this.y = this.floorPx - this.h / 2; const b = this.box; b.x = this.left; b.y = this.top; b.h = this.h; b.dy = dy; b.dx = 0; }
  update(dt, g) {
    super.update(dt);
    const oldTop = this.top;
    this.life -= dt;
    if (this.life > 0) this.h = Math.min(this.fullH, this.h + 260 * dt);
    else { this.h -= 120 * dt; if (this.h <= 2) { this.alive = false; this.box.solid = false; } }
    this.sync(0);
    this.box.dy = this.top - oldTop;
  }
}

// 文字 → エンティティ
export function spawnFromChar(s, level) {
  const x = s.x * TILE + TILE / 2, y = s.y * TILE + TILE / 2;
  switch (s.ch) {
    case 'C': return new Coin(x, y);
    case 'h': return new Heart(x, y);
    case 'K': return new Checkpoint(x, y);
    case 'G': return new Goal(x, y);
    case 'S': return new Spring(x, y);
    case 'O': return new Bumper(x, y);
    case '>': case '<': case 'A': return new Launcher(x, y, s.ch);
    case 'x': return new Switch(x, y, false);
    case 'X': return new Switch(x, y, true);
    case 'u': case 'r': case 'l': return new Fan(x, y, s.ch, level);
    case 'T': return new Press(x, y, level);
    case 'Z': return new Platform(x, y, 'x', 4, 1.1);
    case 'z': return new Platform(x, y, 'y', 3, 1.2);
    case 'k': return new Korobot(x, y);
    case 'g': return new Gachigachi(x, y);
    case 'd': return new Fuwadrone(x, y);
    case 'p': return new Purun(x, y);
    case 't': return new Togemaru(x, y);
    case 'n': return new Ponpon(x, y, -1);
    case 'N': return new Ponpon(x, y, 1);
    default: return null;
  }
}
