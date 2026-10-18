import { TILE, T, clamp } from './consts.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { spawnFromChar } from './entities.js';
import { BOSS_CLASSES } from './bosses.js';
import { FX } from './fx.js';

// 1 ステージのプレイ状態（DOM に依存しない。Node でも動く）
export class Game {
  constructor(opts) {
    this.opts = opts;
    this.stage = opts.stage;
    this.balls = opts.data.balls;
    this.rules = opts.data.rules;
    this.enemyRules = opts.data.enemyRules;
    this.bossRules = opts.data.bossRules;
    this.loadout = opts.loadout;
    this.viewW = opts.viewW || 640;
    this.viewH = opts.viewH || 360;
    this.coinsTaken = new Set();
    this.collected = opts.collected || {};
    this.coins = 0; this.score = 0; this.time = 0; this.misses = 0;
    this.checkpoint = null;
    this.fx = new FX();
    this.cleared = false; this.result = null;
    this.build();
  }

  sfx(name, o) { this.opts.sfx && this.opts.sfx(name, o); }
  emit(type, payload) { this.opts.onEvent && this.opts.onEvent(type, payload); }

  build() {
    const st = this.stage;
    this.level = new Level(st.built);
    this.entities = [];
    this.boss = null; this.bossStarted = false; this.arena = null; this.arenaWind = 0;
    this.deadT = 0; this.shakeT = 0; this.shakeA = 0; this.hitStopT = 0; this.flashT = 0;
    let start = null, bossSpawn = null;
    for (const s of this.level.spawns) {
      if (s.ch === 'P') { start = s; continue; }
      if (s.ch === '@') { bossSpawn = s; continue; }
      if (s.ch === 'C' && this.coinsTaken.has(`${s.x},${s.y}`)) continue;
      const e = s.make ? s.make(this.level) : spawnFromChar(s, this.level);
      if (!e) continue;
      if (e.type === 'pickup' && this.collected[e.id]) {
        if (e.kind !== 'medal') continue; // 取ったボール・ハートのうつわは出さない
        e.got = true;                     // 取ったメダルは半透明で残す
      }
      e.key = `${s.x},${s.y}`;
      if (e.type === 'checkpoint' && this.checkpoint && this.checkpoint.key === e.key) e.on = true;
      this.entities.push(e);
    }
    const sx = this.checkpoint ? this.checkpoint.x : start.x * TILE + TILE / 2;
    const sy = this.checkpoint ? this.checkpoint.y : start.y * TILE + TILE / 2;
    const ball = this.checkpoint?.ball && this.loadout.includes(this.checkpoint.ball) ? this.checkpoint.ball : this.loadout[0];
    this.startPos = { x: start.x * TILE + TILE / 2, y: start.y * TILE + TILE / 2 };
    this.player = new Player(this, sx, sy, ball);
    this.player.maxHp += this.opts.hpBonus || 0;
    this.player.hp = this.player.maxHp;
    // 床の上に置く
    const gy = this.level.groundBelow(sx, sy - 8);
    if (gy != null) this.player.y = this.player.py = gy - this.player.def.r - 1;

    if (bossSpawn && this.level.gates.length) {
      const gx = Math.min(...this.level.gates.map((g) => g.x));
      const by = bossSpawn.y;
      let rx = gx + 1; while (rx < this.level.w && !this.level.solidAt(rx, by)) rx++;
      const floor = this.level.groundBelow(bossSpawn.x * TILE + 8, by * TILE);
      let ty = Math.floor(floor / TILE) - 1; while (ty > 0 && !this.level.solidAt(bossSpawn.x, ty - 1)) ty--;
      this.arena = { x0: (gx + 1) * TILE, x1: rx * TILE, floor, top: ty * TILE, trigger: (gx + 4) * TILE };
      const Cls = BOSS_CLASSES[st.boss];
      this.boss = new Cls(this, bossSpawn.x * TILE + 8, floor - 40);
      if (this.boss.init) this.boss.init(this);
    }
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
  }

  solidBoxes() {
    const out = this._boxes || (this._boxes = []);
    out.length = 0;
    for (const e of this.entities) if (e.box && e.alive !== false && e.box.solid !== false) out.push(e.box);
    return out;
  }

  spawn(e) { this.entities.push(e); return e; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); this.shakeT = 0.3; }
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  flashScreen(t) { this.flashT = Math.max(this.flashT, t); }

  update(dt, input) {
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    this.time += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
    const p = this.player;

    // 動く固体を先に
    for (const e of this.entities) if (e.box && e.alive) e.update(dt, this);

    if (this.deadT > 0) {
      this.deadT -= dt;
      if (this.deadT <= 0) this.respawn();
      this.fx.update(dt);
      return;
    }

    // 風
    p.wind.x = 0; p.wind.y = 0;
    for (const e of this.entities) if (e.type === 'fan') { const w = e.windAt(p.x, p.y); if (w) { p.wind.x += w.x; p.wind.y += w.y; if (Math.random() < dt * 8) this.fx.add({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + 20, vx: w.x * 0.15, vy: w.y * 0.15, life: 0.4, max: 0.4, size: 2, color: 'rgba(255,255,255,0.6)', g: 0, shape: 'line' }); } }
    if (this.bossStarted && this.arenaWind) p.wind.x += this.arenaWind;

    this.magnetPull = null;
    if (!this.cleared) p.update(dt, input);
    else { p.vx *= 0.9; p.vy = 0; }

    for (const e of this.entities) {
      if (!e.box && e.alive) e.update(dt, this);
      if (e.type === 'press' && e.hitsPlayerFromAbove(p)) p.hurt(0, 1, 'press');
    }

    // ボス
    if (this.boss) {
      if (!this.bossStarted && p.x > this.arena.trigger) this.startBoss();
      if (this.bossStarted) this.boss.update(dt);
    }

    // 当たり判定
    if (!p.dead && !this.cleared) {
      for (const e of this.entities) {
        if (!e.alive || !e.touch) continue;
        const c = e.overlap(p);
        if (c) e.touch(p, c, this);
      }
      if (this.boss && this.bossStarted && !this.boss.dead) {
        const c = this.boss.overlap(p);
        if (c) this.boss.touch(p, c, this);
      }
    }

    // 跡
    if (p.speed > 520 || p.launchT > 0) this.fx.trail(p.x, p.y, p.def.r, 'rgba(255,255,255,0.35)');

    this.fx.update(dt);
    this.entities = this.entities.filter((e) => e.alive !== false);

    if (this.bossDefeatT > 0) {
      this.bossDefeatT -= dt;
      if (Math.random() < dt * 14) { const b = this.boss; this.fx.burst(b.x + (Math.random() - 0.5) * b.w, b.y + (Math.random() - 0.5) * b.h, 8, ['#ffd23f', '#ff7b39', '#fff'][Math.floor(Math.random() * 3)], 220); this.sfx('explode', { vol: 0.6 }); }
      if (this.bossDefeatT <= 0) this.finishBoss();
    }
    this.updateCamera(dt);
  }

  // ===== カメラ =====
  camTarget() {
    const p = this.player;
    let tx = p.x - this.viewW / 2 + clamp(p.vx * 0.25, -70, 70);
    let ty = p.y - this.viewH * 0.55;
    if (this.bossStarted) {
      const A = this.arena;
      const aw = A.x1 - A.x0;
      tx = aw + 32 <= this.viewW ? A.x0 + aw / 2 - this.viewW / 2 : clamp(tx, A.x0 - 16, A.x1 + 16 - this.viewW);
    }
    tx = clamp(tx, 0, Math.max(0, this.level.pw - this.viewW));
    ty = clamp(ty, Math.min(0, this.level.ph - this.viewH), Math.max(0, this.level.ph - this.viewH));
    return { tx, ty };
  }
  snapCamera() { const { tx, ty } = this.camTarget(); this.cam.x = tx; this.cam.y = ty; }
  updateCamera(dt) {
    const { tx, ty } = this.camTarget();
    this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 7);
    this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 5);
  }

  // ===== ボス =====
  startBoss() {
    this.bossStarted = true;
    this.level.setGates(true);
    this.boss.active = true;
    this.sfx('gate');
    this.emit('bossStart', { boss: this.boss });
  }
  onBossPhase2(b) { this.sfx('phase2'); this.fx.text(b.x, b.top - 16, 'ＰＨＡＳＥ２', '#ff6b6b', 14); this.emit('bossPhase2', {}); }
  onBossDefeated(b) {
    this.bossDefeatT = 2.2;
    this.entities = this.entities.filter((e) => !(e.type === 'bullet' || e.type === 'hazard' || e.type === 'fallrock'));
    this.arenaWind = 0;
    this.sfx('bossDown');
    this.emit('bossDefeated', {});
  }
  finishBoss() {
    this.cleared = true;
    this.level.setGates(false);
    this.result = { coins: this.coins, time: this.time, score: this.score, reward: this.stage.reward, boss: true };
    this.emit('clear', this.result);
  }

  // ===== イベント =====
  onTransform(prev, id, p) { this.fx.morph(p.x, p.y, p.def.r + 4); this.sfx('morph', { rate: 1 + (Math.random() - 0.5) * 0.1 }); this.emit('transform', { id }); }
  onDeny(kind) { this.sfx('deny'); this.emit('deny', { kind }); }
  onHurt(p) { this.sfx('hurt'); this.shake(5); this.fx.burst(p.x, p.y, 10, '#ff6b6b'); this.emit('hurt', { hp: p.hp }); }
  onPlayerDead() { this.deadT = 1.6; this.misses++; this.sfx('miss'); this.fx.burst(this.player.x, this.player.y, 30, '#fff', 260); this.emit('miss', {}); }
  // 復帰してよい場所か：ボールの下に、壊れない固定の床が左右ともある
  isSafeSpot(x, y, r) {
    const L = this.level;
    const ty = Math.floor((y + r + 2) / TILE);
    const ok = (px) => { const t = L.tile(Math.floor(px / TILE), ty); return t === T.SOLID || t === T.BRICK || t === T.ICE || t === T.MAGNET || t === T.ONEWAY; };
    if (!ok(x) || !ok(x - r * 0.7) || !ok(x + r * 0.7)) return false;
    if (L.zoneAt(x, y)) return false;
    // 近くに動くもの・危険なものが無い
    for (const e of this.entities) {
      if ((e.box || e.enemy || e.type === 'hazard' || e.type === 'launcher') && Math.abs(e.x - x) < 40 + (e.w || 0) / 2 && Math.abs(e.y - y) < 80) return false;
    }
    return true;
  }
  // 復帰地点：直前の安全地点。だめならチェックポイント、それもだめならスタート地点
  safeRespawnPoint(p) {
    const s = p.lastSafe;
    if (s && this.isSafeSpot(s.x, s.y, p.def.r)) return { x: s.x, y: s.y - 4 };
    const base = this.checkpoint || this.startPos;
    const gy = this.level.groundBelow(base.x, base.y - 8);
    return { x: base.x, y: (gy ?? base.y) - p.def.r - 1 };
  }
  // シャボン玉がトゲで割れた：無敵中でも割れて、直前の安全地点へ（落下と同じ扱い）
  onPop(p) {
    if (this._popT && this.time - this._popT < 0.2) return;
    this._popT = this.time;
    this.fx.burst(p.x, p.y, 18, '#cfefff', 200); this.sfx('pop');
    this.onPit(p);
  }
  onPit(p) {
    p.hp -= 1; this.sfx('fall');
    if (p.hp <= 0) { p.dead = true; this.onPlayerDead(); return; }
    const sp = this.safeRespawnPoint(p);
    p.x = p.px = sp.x; p.y = p.py = sp.y; p.vx = 0; p.vy = 0;
    p.invuln = 1.2; p.stuck = null; p.magnetStuck = null;
    this.emit('hurt', { hp: p.hp });
    this.snapCamera();
  }
  respawn() {
    const cp = this.checkpoint;
    this.build();
    this.emit('respawn', {});
    if (cp) this.fx.text(this.player.x, this.player.y - 30, 'リトライ', '#fff');
  }
  onBounce(p, v, c) {
    if (v > 120) this.sfx('bounce_' + p.ball, { vol: clamp(v / 700, 0.25, 1), rate: 0.95 + Math.random() * 0.1 });
    if (v > 380) this.fx.dust(p.x, p.y + p.def.r, 3);
  }
  onLand(p, v) { this.sfx(p.def.heavy ? 'heavyLand' : 'land', { vol: clamp(v / 600, 0.2, 1) }); if (p.def.heavy && v > 400) this.shake(4); this.fx.dust(p.x, p.y + p.def.r, 5); }
  onWallHit(p, v) { this.sfx(p.def.heavy ? 'heavyLand' : 'wall', { vol: clamp(v / 600, 0.2, 0.8) }); }
  onHeavyThud() { if (!this._thudT || this.time - this._thudT > 0.4) { this._thudT = this.time; this.sfx('thud'); } }
  onBreak(cells, kind) {
    if (kind === 'heavy') { this.sfx('break'); this.shake(8); this.hitStop(0.05); this.fx.debris(cells, TILE, this.stage.theme === 'ice' ? '#bfe8ff' : '#8d8f9a'); this.addScore(100, this.player.x, this.player.y - 30); }
    else { this.sfx('melt'); this.fx.steam(cells, TILE); this.addScore(50, this.player.x, this.player.y - 30); }
  }
  onLavaTouch(p) { if (!this._lavaT || this.time - this._lavaT > 0.3) { this._lavaT = this.time; this.sfx('sizzle', { vol: 0.5 }); } }
  onMagnetStick() { this.sfx('magnet'); }
  onSlimeStick(p) { this.sfx('slime', { vol: 0.7 }); }
  onSlimeJump() { this.sfx('slimeJump'); }
  onLaunch(L, p) { this.sfx('launch'); this.shake(3); this.fx.burst(L.x + L.dirX * 10, L.y + L.dirY * 10, 10, '#ffe6a0', 220); }
  onForcedEnter(ball) { this.sfx('forced'); this.emit('forced', { ball }); }
  onForcedExit() { this.emit('forcedExit', {}); }
  onEnemyDefeated(e, how) {
    this.sfx(how === 'stomp' ? 'stomp' : 'smash');
    this.fx.burst(e.x, e.y, 14, '#ffd75e', 200);
    this.addScore(how === 'stomp' ? 100 : 200, e.x, e.top);
    if (how !== 'stomp') this.shake(3);
  }
  // 隠しルートの拾い物
  collectItem(e) {
    e.got = true;
    if (e.kind !== 'medal') e.alive = false;
    this.collected[e.id] = true;
    const p = this.player;
    if (e.kind === 'heart') { p.maxHp++; p.hp = p.maxHp; }
    this.sfx(e.kind === 'medal' ? 'item' : 'reward');
    this.fx.burst(e.x, e.y, 24, e.kind === 'medal' ? '#ffe14d' : e.kind === 'heart' ? '#ff6b8a' : '#fff', 220);
    this.addScore(e.kind === 'medal' ? 500 : 1000, e.x, e.y - 20);
    this.emit('collect', { kind: e.kind, id: e.id, ball: e.ball });
  }
  collectCoin(c) { this.coins++; this.coinsTaken.add(c.key); this.score += 10; this.sfx('coin', { rate: 1 + (this.coins % 5) * 0.03 }); this.fx.burst(c.x, c.y, 5, '#ffe14d', 90, { g: 0, up: 0 }); }
  addScore(n, x, y) { this.score += n; if (x !== undefined) this.fx.text(x, y, String(n), '#fff'); }
  setCheckpoint(cp) {
    this.checkpoint = { key: cp.key, x: cp.x, y: cp.y + 12, ball: this.player.ball };
    if (this.player.hp < this.player.maxHp) this.player.hp = this.player.maxHp;
    this.sfx('checkpoint'); this.fx.burst(cp.x, cp.top, 16, '#7dffb0', 180);
    this.emit('checkpoint', {});
  }
  reachGoal() {
    if (this.cleared) return;
    this.cleared = true;
    this.result = { coins: this.coins, time: this.time, score: this.score, reward: this.stage.reward || null, boss: false };
    this.sfx('goal');
    this.emit('clear', this.result);
  }
  openNearestDoor(sw) {
    let best = null, bd = 1e9;
    for (const g of this.level.doorGroups) {
      if (g.open) continue;
      const d = Math.hypot(g.cx * TILE - sw.x, (g.cy * TILE - sw.y) * 0.5);
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) return;
    best.open = true;
    for (const c of best.cells) this.level.setTile(c.x, c.y, T.EMPTY);
    this.fx.steam(best.cells, TILE);
    this.sfx('door');
    this.fx.text(sw.x, sw.y - 20, 'ひらいた！', '#fff');
  }
}
