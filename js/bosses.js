import { TILE, sign, clamp } from './consts.js';
import { circleBox, circleCircle } from './physics.js';
import { Bullet, Hazard, Pillar } from './entities.js';

// ボス共通：Telegraph → Attack → Recovery → Vulnerable → Reset の状態機械
export class Boss {
  constructor(g, x, y, opts) {
    this.g = g;
    this.x = x; this.y = y;
    this.w = opts.w; this.h = opts.h;
    this.maxHp = opts.hp; this.hp = opts.hp;
    this.id = opts.id; this.name = opts.name;
    this.state = 'Idle'; this.timer = 1.2; this.t = 0;
    this.facing = -1; this.flash = 0; this.invuln = 0;
    this.phase2 = false; this.dead = false; this.deadT = 0; this.active = false;
    this.alive = true;
    this.arena = g.arena;
    this.floor = g.arena.floor;
  }
  get left() { return this.x - this.w / 2; }
  get top() { return this.y - this.h / 2; }
  set(state, timer) { this.state = state; this.timer = timer; this.stateT = 0; }
  overlap(p) { return circleBox(p.x, p.y, p.r, this.left, this.top, this.w, this.h); }
  facePlayer() { this.facing = this.g.player.x < this.x ? -1 : 1; }
  update(dt) {
    this.t += dt;
    this.stateT = (this.stateT || 0) + dt;
    this.flash = Math.max(0, this.flash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.dead) { this.deadT += dt; return; }
    this.timer -= dt;
    this.think(dt);
  }
  damage(n = 1, src = '') {
    if (this.invuln > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - n);
    this.flash = 0.6; this.invuln = 0.9;
    const g = this.g;
    g.sfx('bossHit'); g.shake(7); g.hitStop(0.08);
    g.fx.burst(this.x, this.y - this.h / 4, 18, '#fff3a0');
    if (this.hp <= 0) { this.dead = true; this.state = 'Defeated'; g.onBossDefeated(this); return true; }
    if (!this.phase2 && this.hp <= this.maxHp * (g.bossRules.phase2HpFraction ?? 0.5)) { this.phase2 = true; g.onBossPhase2(this); }
    return true;
  }
  // プレイヤーを押し返す（無傷）
  pushPlayer(p, c, v = 420) {
    p.x += c.nx * c.pen; p.y += c.ny * c.pen;
    p.stuck = null; p.magnetStuck = null;
    p.vx = (c.nx || sign(p.x - this.x) || 1) * v * (Math.abs(c.nx) > 0.3 ? 1 : 0.6);
    p.vy = Math.min(p.vy, c.ny < -0.3 ? -v : -220);
  }
  stomp(p, v = 520) { p.launchUp(Math.max(v, p.def.kind === 'bounce' ? p.def.bounceV * p.mult : 0)); }
  hitByBullet() { return false; }
  get weakPoint() { return null; }
}

const isStomp = (p, c) => c.ny < -0.45 && p.vy > -80;

// ===== 1. ドリルライノ（工場）：突進 → 壁に激突 → 背中の弱点露出 =====
export class DrillRhino extends Boss {
  constructor(g, x, y) { super(g, x, y, { w: 78, h: 52, hp: 4, id: 'drill_rhino', name: 'ドリルライノ' }); this.y = this.floor - this.h / 2; this.vx = 0; }
  think(dt) {
    const g = this.g, A = this.arena;
    switch (this.state) {
      case 'Idle':
        this.facePlayer();
        if (this.timer <= 0) { this.set('Telegraph', this.phase2 ? 0.65 : 0.85); g.sfx('bossWarn'); }
        break;
      case 'Telegraph':
        if (this.timer <= 0) { this.set('Attack', 9); this.vx = this.facing * (this.phase2 ? 470 : 360); g.sfx('charge'); }
        break;
      case 'Attack': {
        this.x += this.vx * dt;
        if (Math.random() < dt * 20) g.fx.dust(this.x - this.facing * 30, this.floor, 2);
        const lim0 = A.x0 + this.w / 2, lim1 = A.x1 - this.w / 2;
        if (this.x <= lim0 || this.x >= lim1) {
          this.x = clamp(this.x, lim0, lim1);
          this.set('Vulnerable', this.phase2 ? 2.0 : 2.6);
          g.shake(10); g.sfx('crash');
          g.fx.burst(this.x + this.facing * 40, this.y, 14, '#ffcf6b');
          if (this.phase2) for (let i = 0; i < 3; i++) {
            const rx = A.x0 + 40 + Math.random() * (A.x1 - A.x0 - 80);
            g.spawn(new FallingRock(rx, A.top + 10, 0.6 + i * 0.25));
          }
        }
        break;
      }
      case 'Vulnerable':
        if (this.timer <= 0) this.set('Reset', 0.5);
        break;
      case 'Recovery':
      case 'Reset':
        if (this.timer <= 0) { this.facePlayer(); this.set('Idle', this.phase2 ? 0.6 : 1.0); }
        break;
    }
  }
  get weakPoint() { return this.state === 'Vulnerable' ? { x: this.x - this.facing * 10, y: this.top + 4 } : null; }
  touch(p, c, g) {
    if (this.state === 'Vulnerable') {
      if (isStomp(p, c)) { this.stomp(p); this.damage(p.def.heavy ? 2 : 1); this.set('Recovery', 0.7); return; }
      if (p.def.heavy && p.speed > 220) { this.pushPlayer(p, c, 200); this.damage(2); this.set('Recovery', 0.7); return; }
      this.pushPlayer(p, c, 300); return;
    }
    if (isStomp(p, c)) { this.stomp(p, 480); g.sfx('armor'); return; }
    if (this.state === 'Attack' || this.state === 'Telegraph') { p.hurt(c.nx, c.ny, 'boss'); return; }
    this.pushPlayer(p, c, 320);
    if (Math.abs(c.nx) > 0.6) p.hurt(c.nx, c.ny, 'boss');
  }
}

// 天井から落ちる岩（見た目用、当たりは Hazard と同期）
export class FallingRock {
  constructor(x, y, warn) { this.type = 'fallrock'; this.x = x; this.y = y; this.vy = 0; this.warn = warn; this.alive = true; this.w = 18; this.h = 18; this.t = 0; }
  get left() { return this.x - 9; } get top() { return this.y - 9; }
  update(dt, g) {
    this.t += dt;
    if (this.warn > 0) { this.warn -= dt; return; }
    this.vy += 1400 * dt; this.y += this.vy * dt;
    if (g.level.solidAt(Math.floor(this.x / TILE), Math.floor((this.y + 9) / TILE))) { this.alive = false; g.fx.burst(this.x, this.y, 8, '#a58a6a'); g.sfx('rock'); }
  }
  overlap(p) { return this.warn > 0 ? null : circleCircle(p.x, p.y, p.r, this.x, this.y, 9); }
  touch(p, c) { if (!p.def.heavy) p.hurt(c.nx, c.ny, 'rock'); this.alive = false; }
}

// ===== 2. ストームクラウド（天空都市）：風向き変化と落雷、疲れると降りてきて頭上が弱点 =====
export class StormCloud extends Boss {
  constructor(g, x, y) {
    super(g, x, y, { w: 88, h: 50, hp: 4, id: 'storm_cloud', name: 'ストームクラウド' });
    this.highY = this.floor - 165; this.lowY = this.floor - 82; this.y = this.highY;
    this.strikes = 0; this.windDir = 1; this.windT = 5; this.windWarn = 0; this.markX = 0;
  }
  think(dt) {
    const g = this.g, A = this.arena, p = g.player;
    // 風向き（予告 1 秒）
    this.windT -= dt;
    if (this.windT <= 1 && this.windWarn === 0) { this.windWarn = 1; g.sfx('windShift'); }
    if (this.windT <= 0) { this.windDir *= -1; this.windT = this.phase2 ? 4 : 5.5; this.windWarn = 0; }
    g.arenaWind = this.state === 'Vulnerable' ? 0 : this.windDir * (this.phase2 ? 520 : 400);
    const tx = clamp(p.x, A.x0 + 60, A.x1 - 60);
    switch (this.state) {
      case 'Idle':
        this.x += clamp(tx - this.x, -90 * dt, 90 * dt);
        this.y += (this.highY - this.y) * Math.min(1, dt * 2);
        if (this.timer <= 0) { this.markX = p.x; this.set('Telegraph', this.phase2 ? 0.7 : 0.9); g.sfx('thunderWarn'); }
        break;
      case 'Telegraph':
        this.x += clamp(this.markX - this.x, -120 * dt, 120 * dt);
        if (this.timer <= 0) {
          const xs = this.phase2 ? [this.markX, this.markX + (Math.random() < 0.5 ? -90 : 90)] : [this.markX];
          for (const bx of xs) g.spawn(new Hazard(bx, (this.y + this.floor) / 2, 22, this.floor - this.y, 0.35, { kind: 'bolt' }));
          g.sfx('thunder'); g.shake(6); g.flashScreen(0.15);
          this.strikes++;
          this.set('Attack', 0.6);
        }
        break;
      case 'Attack':
        if (this.timer <= 0) {
          if (this.strikes >= 3) { this.strikes = 0; this.set('Recovery', 0.8); g.sfx('tired'); }
          else this.set('Idle', this.phase2 ? 0.5 : 0.8);
        }
        break;
      case 'Recovery':
        this.y += (this.lowY - this.y) * Math.min(1, dt * 4);
        if (this.timer <= 0) this.set('Vulnerable', this.phase2 ? 3.2 : 3.8);
        break;
      case 'Vulnerable':
        this.y += (this.lowY + Math.sin(this.t * 3) * 4 - this.y) * Math.min(1, dt * 4);
        if (this.timer <= 0) this.set('Reset', 0.8);
        break;
      case 'Reset':
        this.y += (this.highY - this.y) * Math.min(1, dt * 2);
        if (this.timer <= 0) this.set('Idle', 1);
        break;
    }
  }
  get weakPoint() { return this.state === 'Vulnerable' || this.state === 'Recovery' ? { x: this.x, y: this.top + 2 } : null; }
  touch(p, c, g) {
    if ((this.state === 'Vulnerable' || this.state === 'Recovery') && isStomp(p, c)) { this.stomp(p, 560); this.damage(1); this.set('Reset', 0.9); return; }
    if (isStomp(p, c)) { this.stomp(p, 380); g.sfx('puff'); return; }
    this.pushPlayer(p, c, 300); g.sfx('puff');
  }
}

// ===== 3. マグマゴーレム（火山）：冷却装置で冷やすと胸のコアが露出 =====
export class MagmaGolem extends Boss {
  constructor(g, x, y) { super(g, x, y, { w: 66, h: 76, hp: 4, id: 'magma_golem', name: 'マグマゴーレム' }); this.y = this.floor - this.h / 2; this.cooled = 0; }
  init(g) {
    const sw = g.entities.filter((e) => e.type === 'switch' && e.x > this.arena.x0 && e.x < this.arena.x1);
    for (const s of sw) {
      s.reusable = true; s.rechargeTime = 5; s.role = 'cool';
      s.onPress = (gg) => {
        gg.spawn(new Spray(s.x, s.y - 20, this));
        gg.sfx('cool');
      };
    }
  }
  freeze() {
    if (this.dead) return;
    this.cooled = this.phase2 ? 3.2 : 4;
    this.set('Vulnerable', this.cooled);
    this.g.sfx('freeze');
  }
  think(dt) {
    const g = this.g, A = this.arena, p = g.player;
    switch (this.state) {
      case 'Idle':
        this.facePlayer();
        this.x = clamp(this.x + this.facing * (this.phase2 ? 45 : 30) * dt, A.x0 + 90, A.x1 - 90);
        if (this.timer <= 0) { this.set('Telegraph', this.phase2 ? 0.65 : 0.85); g.sfx('bossWarn'); }
        break;
      case 'Telegraph':
        if (this.timer <= 0) {
          g.shake(8); g.sfx('slam');
          const n = this.phase2 ? 4 : 3;
          for (let i = 0; i < n; i++) {
            const vx = (p.x - this.x) * 0.9 + (i - (n - 1) / 2) * 90;
            g.spawn(new Bullet(this.x, this.top + 10, clamp(vx, -320, 320), -560 - i * 30, this, { gravity: 1100, kind: 'lava', r: 7, reflectable: false, life: 4 }));
          }
          for (const s of [-1, 1]) g.spawn(new Hazard(this.x + s * 40, this.floor - 8, 18, 16, 2.2, { kind: 'wave', vx: s * 230 }));
          this.set('Attack', 0.5);
        }
        break;
      case 'Attack':
        if (this.timer <= 0) this.set('Recovery', this.phase2 ? 0.8 : 1.2);
        break;
      case 'Recovery':
        if (this.timer <= 0) this.set('Idle', this.phase2 ? 1.1 : 1.6);
        break;
      case 'Vulnerable':
        this.cooled = this.timer;
        if (this.timer <= 0) { this.cooled = 0; this.set('Reset', 0.6); g.sfx('reheat'); }
        break;
      case 'Reset':
        if (this.timer <= 0) this.set('Idle', 1);
        break;
    }
  }
  get weakPoint() { return this.state === 'Vulnerable' ? { x: this.x, y: this.y - 6 } : null; }
  touch(p, c, g) {
    if (this.state === 'Vulnerable') {
      this.pushPlayer(p, c, 380);
      if (this.damage(p.def.heavy ? 2 : 1)) { this.cooled = 0; this.set('Reset', 0.8); }
      return;
    }
    if (p.def.lavaProof) { this.pushPlayer(p, c, 380); return; }
    p.hurt(c.nx, c.ny, 'lava');
  }
}

// 冷却スプレー：ゴーレムへ飛んでいく冷気
export class Spray {
  constructor(x, y, target) { this.type = 'spray'; this.x = x; this.y = y; this.target = target; this.alive = true; this.t = 0; this.w = 20; this.h = 20; }
  get left() { return this.x - 10; } get top() { return this.y - 10; }
  update(dt, g) {
    this.t += dt;
    const tg = this.target;
    const dx = tg.x - this.x, dy = tg.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.x += (dx / d) * 420 * dt; this.y += (dy / d) * 420 * dt;
    g.fx.snow(this.x, this.y);
    if (d < 30) { this.alive = false; tg.freeze(); g.fx.burst(tg.x, tg.y, 20, '#bfefff'); }
  }
  overlap() { return null; }
}

// ===== 4. バンパースパイダー（遊園地）：正面はバンパー、背後が弱点 =====
export class BumperSpider extends Boss {
  constructor(g, x, y) {
    super(g, x, y, { w: 64, h: 60, hp: 5, id: 'bumper_spider', name: 'バンパースパイダー' });
    this.R = 30; this.y = this.floor - 34; this.turnDelay = 0; this.vy = 0; this.vx = 0; this.airborne = false; this.attacks = 0;
  }
  overlap(p) { return circleCircle(p.x, p.y, p.r, this.x, this.y, this.R); }
  think(dt) {
    const g = this.g, A = this.arena, p = g.player;
    const want = p.x < this.x ? -1 : 1;
    const canTurn = this.state === 'Idle' || this.state === 'Telegraph';
    if (canTurn && want !== this.facing) {
      this.turnDelay += dt;
      if (this.turnDelay > (this.phase2 ? 0.45 : 0.7)) { this.facing = want; this.turnDelay = 0; g.sfx('spiderTurn'); }
    } else this.turnDelay = 0;
    if (this.airborne) {
      this.vy += 1500 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      this.x = clamp(this.x, A.x0 + this.R, A.x1 - this.R);
      if (this.y >= this.floor - 34) { this.y = this.floor - 34; this.airborne = false; g.shake(8); g.sfx('slam'); for (const s of [-1, 1]) g.spawn(new Hazard(this.x + s * 34, this.floor - 7, 16, 14, 1.6, { kind: 'wave', vx: s * 240 })); }
    }
    switch (this.state) {
      case 'Idle':
        if (this.timer <= 0) { this.set('Telegraph', this.phase2 ? 0.55 : 0.75); g.sfx('bossWarn'); }
        break;
      case 'Telegraph':
        if (this.timer <= 0) {
          this.attacks++;
          if (this.phase2 && this.attacks % 2 === 0) {
            this.airborne = true; this.vy = -700;
            const target = clamp(p.x, A.x0 + 60, A.x1 - 60);
            this.vx = clamp((target - this.x) / 0.9, -380, 380);
            g.sfx('jump');
          } else {
            const n = this.phase2 ? 5 : 3;
            for (let i = 0; i < n; i++) {
              const a = Math.atan2(p.y - this.y, p.x - this.x) + (i - (n - 1) / 2) * 0.28;
              g.spawn(new Bullet(this.x + this.facing * 26, this.y - 6, Math.cos(a) * 190, Math.sin(a) * 190, this, { kind: 'web', r: 7 }));
            }
            g.sfx('web');
          }
          this.set('Attack', 0.6);
        }
        break;
      case 'Attack':
        if (this.timer <= 0 && !this.airborne) this.set('Recovery', this.phase2 ? 1.4 : 1.9);
        break;
      case 'Recovery': // 目を回して向きを変えない＝背後を取るチャンス
        if (this.timer <= 0) this.set('Reset', 0.3);
        break;
      case 'Reset':
        if (this.timer <= 0) this.set('Idle', this.phase2 ? 0.9 : 1.3);
        break;
    }
  }
  get weakPoint() { return { x: this.x - this.facing * 24, y: this.y - 4 }; }
  isBack(nx) { return sign(nx) === -this.facing && Math.abs(nx) > 0.25; }
  touch(p, c, g) {
    if (this.isBack(c.nx)) {
      this.pushPlayer(p, c, 420);
      if (this.damage(1)) { this.facing = -this.facing; this.set('Reset', 0.6); }
      return;
    }
    // 正面と頭上はバンパー
    p.x += c.nx * c.pen; p.y += c.ny * c.pen;
    p.stuck = null; p.magnetStuck = null;
    p.vx = c.nx * 600; p.vy = c.ny * 600 - 80;
    p.launchT = 0.3;
    this.bump = 1; g.sfx('bumper');
  }
  hitByBullet(b, g) {
    if (circleCircle(b.x, b.y, b.r, this.x, this.y, this.R)) { this.damage(1); return true; }
    return false;
  }
}

// ===== 5. モグドリラー（地下鉱山）：地中から突き上げ、スイッチで動きを止めると頭が弱点 =====
export class MoguDriller extends Boss {
  constructor(g, x, y) { super(g, x, y, { w: 56, h: 58, hp: 4, id: 'mogu_driller', name: 'モグドリラー' }); this.under = true; this.y = this.floor + 40; this.markX = x; this.armed = 0; this.rise = 0; }
  init(g) {
    const sw = g.entities.filter((e) => e.type === 'switch' && e.x > this.arena.x0 && e.x < this.arena.x1);
    for (const s of sw) {
      s.reusable = true; s.rechargeTime = 4; s.role = 'clamp';
      s.onPress = (gg) => { gg.sfx('clamp'); this.armed = 3; };
    }
  }
  overlap(p) { return this.under && this.state !== 'Attack' ? null : super.overlap(p); }
  think(dt) {
    const g = this.g, A = this.arena, p = g.player;
    this.armed = Math.max(0, this.armed - dt);
    const surfY = this.floor - this.h / 2;
    switch (this.state) {
      case 'Idle': // 地中を移動
        this.under = true; this.y = this.floor + 40;
        if (this.timer <= 0) { this.markX = clamp(p.x, A.x0 + 40, A.x1 - 40); this.x = this.markX; this.set('Telegraph', this.phase2 ? 0.7 : 0.95); g.sfx('rumble'); }
        break;
      case 'Telegraph':
        if (Math.random() < dt * 30) g.fx.dust(this.markX + (Math.random() - 0.5) * 40, this.floor, 1);
        if (this.timer <= 0) { this.set('Attack', 0.45); g.sfx('drill'); g.shake(6); g.fx.burst(this.x, this.floor, 16, '#8a6a4a'); }
        break;
      case 'Attack': // 突き上げ
        this.under = false;
        this.y += (surfY - 24 - this.y) * Math.min(1, dt * 14);
        if (this.timer <= 0) {
          this.set('Surface', this.phase2 ? 1.6 : 2.2);
          if (this.phase2) for (const s of [-1, 1]) g.spawn(new Bullet(this.x, this.top, s * 160, -520, this, { gravity: 1100, kind: 'rock', r: 7, reflectable: false }));
        }
        break;
      case 'Surface':
        this.y += (surfY - this.y) * Math.min(1, dt * 8);
        if (this.armed > 0) { this.armed = 0; this.set('Vulnerable', this.phase2 ? 3 : 3.6); g.sfx('stun'); g.fx.text(this.x, this.top - 10, 'ガシャン！', '#fff'); }
        else if (this.timer <= 0) this.set('Reset', 0.5);
        break;
      case 'Vulnerable':
        this.y = surfY;
        if (this.timer <= 0) this.set('Reset', 0.4);
        break;
      case 'Reset': // 潜る
        this.y += 160 * dt;
        if (this.timer <= 0) { this.under = true; this.set('Idle', this.phase2 ? 0.6 : 1.0); }
        break;
    }
  }
  get weakPoint() { return this.state === 'Vulnerable' ? { x: this.x, y: this.top + 6 } : null; }
  touch(p, c, g) {
    if (this.state === 'Vulnerable') {
      if (isStomp(p, c)) { this.stomp(p); if (this.damage(p.def.heavy ? 2 : 1)) this.set('Reset', 0.5); return; }
      this.pushPlayer(p, c, 300); return;
    }
    if (this.state === 'Attack') { p.hurt(c.nx, c.ny, 'drill'); return; }
    if (isStomp(p, c)) { this.stomp(p, 460); g.sfx('armor'); return; }
    if (Math.abs(c.nx) > 0.5) p.hurt(c.nx, c.ny, 'drill'); else this.pushPlayer(p, c, 300);
  }
}

// ===== 6. フリーズキング（氷雪城）：正面は氷の盾。氷柱を足場に背後へ回る =====
export class FreezeKing extends Boss {
  constructor(g, x, y) { super(g, x, y, { w: 50, h: 74, hp: 5, id: 'freeze_king', name: 'フリーズキング' }); this.y = this.floor - this.h / 2; this.turnDelay = 0; this.attacks = 0; this.vx = 0; }
  think(dt) {
    const g = this.g, A = this.arena, p = g.player;
    const want = p.x < this.x ? -1 : 1;
    const canTurn = this.state === 'Idle' || this.state === 'Telegraph';
    if (canTurn && want !== this.facing) {
      this.turnDelay += dt;
      if (this.turnDelay > (this.phase2 ? 0.5 : 0.8)) { this.facing = want; this.turnDelay = 0; }
    } else this.turnDelay = 0;
    switch (this.state) {
      case 'Idle':
        this.vx += this.facing * 60 * dt; this.vx *= Math.pow(0.4, dt);
        this.x = clamp(this.x + this.vx * dt, A.x0 + 40, A.x1 - 40);
        if (this.timer <= 0) { this.set('Telegraph', this.phase2 ? 0.55 : 0.75); g.sfx('bossWarn'); }
        break;
      case 'Telegraph':
        if (this.timer <= 0) {
          this.attacks++;
          if (this.attacks % 2 === 1) {
            // 氷柱：プレイヤーの近くに足場が生える
            const base = clamp(p.x, A.x0 + 40, A.x1 - 40);
            const xs = [base - this.facing * 20, base - this.facing * 76];
            const hs = [4, 7];
            xs.forEach((xx, i) => {
              const x = clamp(xx, A.x0 + 24, A.x1 - 24);
              if (Math.abs(x - this.x) > 50) g.spawn(new Pillar(x, this.floor, hs[i], this.phase2 ? 5 : 6.5, 'ice'));
            });
            g.sfx('icePillar');
          } else {
            const n = this.phase2 ? 5 : 3;
            for (let i = 0; i < n; i++) g.spawn(new Bullet(this.x + this.facing * 20, this.top + 14, this.facing * (150 + i * 45), -380 + i * 40, this, { gravity: 900, kind: 'ice', r: 6 }));
            g.sfx('iceShot');
          }
          this.set('Attack', 0.5);
        }
        break;
      case 'Attack':
        if (this.timer <= 0) this.set('Recovery', this.phase2 ? 1.2 : 1.6);
        break;
      case 'Recovery':
        if (this.timer <= 0) this.set('Reset', 0.2);
        break;
      case 'Reset':
        if (this.timer <= 0) this.set('Idle', this.phase2 ? 0.9 : 1.3);
        break;
    }
  }
  get weakPoint() { return { x: this.x - this.facing * 22, y: this.y }; }
  touch(p, c, g) {
    if (sign(c.nx) === -this.facing && Math.abs(c.nx) > 0.3) {
      this.pushPlayer(p, c, 420);
      if (this.damage(p.def.heavy ? 2 : 1)) { this.set('Reset', 0.7); }
      return;
    }
    if (c.ny < -0.5) { // 氷の冠：背中側へ滑り落とす
      p.launchUp(420, -this.facing * 160);
      g.sfx('armor');
      return;
    }
    // 正面の盾
    this.pushPlayer(p, c, 460); g.sfx('shield');
  }
  hitByBullet(b, g) {
    if (b.kind === 'ice' && circleBox(b.x, b.y, b.r, this.left, this.top, this.w, this.h)) {
      if (sign(b.x - this.x) === -this.facing) { this.damage(1); } else g.sfx('shield');
      return true;
    }
    return false;
  }
}

export const BOSS_CLASSES = { drill_rhino: DrillRhino, storm_cloud: StormCloud, magma_golem: MagmaGolem, bumper_spider: BumperSpider, mogu_driller: MoguDriller, freeze_king: FreezeKing };
