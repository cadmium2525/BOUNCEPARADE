import {
  TILE, T, GRAVITY, MAX_FALL, MAX_SPEED, BOUNCE_BASE, BOUNCE_MAX, BOUNCE_LOW, BOUNCE_CHARGE_TIME,
  HEAVY_BREAK_SPEED, ZONE_BALL, clamp, sign,
} from './consts.js';
import { shapeCircles, resolve, shapeFree, pathFree } from './physics.js';

const SUBSTEP_MAX = 5;
const RUGBY_I = 190;

export class Player {
  constructor(game, x, y, ballId) {
    this.game = game;
    this.rules = game.rules;
    this.x = x; this.y = y; this.px = x; this.py = y;
    this.vx = 0; this.vy = 0;
    this.angle = 0; this.av = 0; this.spin = 0;
    this.setBall(ballId);
    this.maxHp = game.enemyRules.defaultHp ?? 3;
    this.hp = this.maxHp;
    this.invuln = 0; this.hurtT = 0;
    this.cd = 0; this.cdMax = this.rules.changeCooldownSeconds ?? 0.12;
    this.queue = null;
    this.holdT = 0; this.mult = BOUNCE_BASE;
    this.groundT = 1; this.groundN = null; this.groundType = 0;
    this.stuck = null; this.stickCd = 0;
    this.magnetStuck = null;
    this.captured = null; this.launchT = 0; this.launcherCd = 0;
    this.forced = null;
    this.riding = null;
    this.squash = 0; this.denyT = 0; this.morphT = 0;
    this.dead = false;
    this.lastSafe = { x, y };
    this.wind = { x: 0, y: 0 };
  }

  setBall(id) {
    this.ball = id;
    this.def = this.game.balls[id];
    if (!this.def.capsule) this.angle = this.angle % (Math.PI * 2);
  }

  get r() { return this.def.hitR; }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get grounded() { return this.groundT < 0.06; }
  get state() {
    if (this.forced) return 'ForcedBall';
    if (this.hurtT > 0) return 'Damaged';
    if (this.captured || this.launchT > 0) return 'Launched';
    if (this.grounded && this.def.kind !== 'bounce' && this.speed < 6) return 'Resting';
    if (this.grounded) return 'GroundContact';
    return 'Airborne';
  }

  circles(x = this.x, y = this.y, def = this.def, angle = this.angle) { return shapeCircles(x, y, def, angle); }

  // ===== 変身 =====
  requestBall(id, source = 'manual') {
    if (source === 'manual' && this.forced) { this.deny('lock'); return; }
    if (!this.game.balls[id]) return;
    if (id === this.ball) { this.queue = null; return; } // 同一ボールは CD を消費しない
    if (source === 'forced') { if (this.tryTransform(id)) { this.cd = 0; } else this.queue = { id, t: 99, forced: true }; return; }
    if (this.cd > 0) { this.queue = { id, t: this.rules.inputBufferSeconds ?? 0.5 }; return; }
    if (this.tryTransform(id)) { this.cd = this.cdMax; this.queue = null; }
    else this.queue = { id, t: this.rules.inputBufferSeconds ?? 0.5 };
  }

  tryTransform(id) {
    const nd = this.game.balls[id];
    const od = this.def;
    const boxes = this.game.solidBoxes();
    const newAngle = nd.capsule ? 0 : this.angle;
    const dr = nd.r - od.r;
    const cands = [];
    if (this.grounded && this.groundN && this.groundN.ny < -0.5) cands.push([this.x, this.y - dr]);
    cands.push([this.x, this.y]);
    if (dr > 0 || nd.capsule) {
      const m = Math.max(dr, nd.halfLen ? nd.halfLen + 2 : 0, 2);
      for (const s of [0.5, 1, 1.5]) {
        const k = m * s;
        cands.push([this.x, this.y - k], [this.x, this.y + k], [this.x + k, this.y], [this.x - k, this.y],
          [this.x + k, this.y - k], [this.x - k, this.y - k], [this.x + k, this.y + k], [this.x - k, this.y + k]);
      }
    }
    for (const [cx, cy] of cands) {
      if (!shapeFree(this.game.level, shapeCircles(cx, cy, nd, newAngle), boxes)) continue;
      if ((cx !== this.x || cy !== this.y) && !pathFree(this.game.level, od, this.angle, this.x, this.y, cx, cy, boxes)) continue;
      this.x = cx; this.y = cy;
      this.px = cx; this.py = cy;
      const prev = this.ball;
      this.setBall(id);
      if (nd.capsule) { this.angle = 0; this.av = 0; }
      this.stuck = null; this.magnetStuck = null;
      if (nd.kind === 'float' && this.vy > nd.maxFall) this.vy = nd.maxFall * 1.5;
      this.morphT = 0.25;
      this.game.onTransform(prev, id, this);
      return true;
    }
    return false;
  }

  deny(kind) {
    this.denyT = 0.3;
    this.game.onDeny(kind);
  }

  // ===== 被弾 =====
  hurt(nx = 0, ny = -1, src = '') {
    if (this.invuln > 0 || this.dead || this.game.cleared) return false;
    this.hp -= this.game.enemyRules.hitDamage ?? 1;
    this.invuln = this.game.enemyRules.invulnerabilitySeconds ?? 1.2;
    this.hurtT = 0.25;
    this.stuck = null; this.magnetStuck = null; this.captured = null;
    const kx = Math.abs(nx) > 0.2 ? sign(nx) : (sign(this.vx) ? -sign(this.vx) : 1);
    this.vx = kx * 220;
    this.vy = Math.min(this.vy, -340);
    this.game.onHurt(this, src);
    if (this.hp <= 0) { this.dead = true; this.game.onPlayerDead(); }
    return true;
  }

  // ===== 更新 =====
  update(dt, input) {
    const g = this.game;
    const level = g.level;
    this.px = this.x; this.py = this.y;
    this.cd = Math.max(0, this.cd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.stickCd = Math.max(0, this.stickCd - dt);
    this.launcherCd = Math.max(0, this.launcherCd - dt);
    this.launchT = Math.max(0, this.launchT - dt);
    this.denyT = Math.max(0, this.denyT - dt);
    this.morphT = Math.max(0, this.morphT - dt);
    this.squash *= Math.pow(0.0005, dt);
    this.groundT += dt;

    // 入力されたボール（最新の1件）
    if (input.taps.length) this.requestBall(input.taps[input.taps.length - 1], 'manual');

    // 強制区間
    const zone = ZONE_BALL[level.zoneAt(this.x, this.y)] || null;
    if (zone) {
      if (!this.forced) g.onForcedEnter(zone);
      this.forced = zone;
      if (this.ball !== zone && !(this.queue && this.queue.forced && this.queue.id === zone)) this.requestBall(zone, 'forced');
    } else if (this.forced) {
      this.forced = null; this.cd = 0; this.queue = null;
      g.onForcedExit();
    }

    // 予約された変身
    if (this.queue) {
      this.queue.t -= dt;
      if (this.cd <= 0 || this.queue.forced) {
        if (this.queue.id === this.ball) this.queue = null;
        else if (this.tryTransform(this.queue.id)) { this.cd = this.queue.forced ? 0 : this.cdMax; this.queue = null; }
      }
      if (this.queue && this.queue.t <= 0) { this.queue = null; this.deny('blocked'); }
    }

    // 動く床に乗っている
    if (this.riding) {
      this.x += this.riding.dx; this.y += this.riding.dy;
      this.riding = null;
    }

    // 発射装置の中
    if (this.captured) {
      const L = this.captured;
      this.x += (L.cx - this.x) * Math.min(1, dt * 25);
      this.y += (L.cy - this.y) * Math.min(1, dt * 25);
      this.vx = 0; this.vy = 0;
      L.holdT -= dt;
      if (L.holdT <= 0) {
        this.captured = null;
        this.x = L.cx; this.y = L.cy;
        this.vx = L.dirX * L.power; this.vy = L.dirY * L.power;
        this.launchT = 0.6; this.launcherCd = 0.4;
        g.onLaunch(L, this);
      }
      return;
    }

    const d = this.def;
    // 反発倍率
    if (input.bounce) this.holdT += dt; else this.holdT = 0;
    this.mult = input.down ? BOUNCE_LOW : BOUNCE_BASE + (BOUNCE_MAX - BOUNCE_BASE) * Math.min(1, this.holdT / BOUNCE_CHARGE_TIME);

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const control = this.hurtT > 0 ? 0.3 : 1;

    // 吸着している面がなくなったら離れる
    if (this.stuck && !this.touching(this.stuck)) this.stuck = null;
    if (this.magnetStuck && !this.touching(this.magnetStuck)) this.magnetStuck = null;
    // 吸着（スライム）
    if (this.stuck) {
      const s = this.stuck;
      if (input.bouncePressed) {
        this.stuck = null; this.stickCd = 0.15;
        if (s.ny < -0.5) { this.vx = dir * 180; this.vy = -560 * Math.max(this.mult, 0.85); }
        else if (s.ny > 0.5) { this.vx = dir * 120; this.vy = 120; }
        else { this.vx = s.nx * 330; this.vy = -480; }
        g.onSlimeJump(this);
      } else {
        if (Math.abs(s.nx) > 0.5) { this.vx = -s.nx * 20; this.vy = 28; }
        else if (s.ny < -0.5) { this.vx = dir * 75; this.vy = 20; }
        else { s.t = (s.t || 0) + dt; this.vx = dir * 60; this.vy = -20; if (s.t > 1.4) { this.stuck = null; this.stickCd = 0.3; } }
      }
    } else if (this.magnetStuck && input.bounce && d.magnet) {
      const s = this.magnetStuck;
      if (Math.abs(s.ny) > 0.5) { this.vx = dir * 190; this.vy = -s.ny * 60; }
      else { const up = dir === -sign(s.nx) ? -1 : dir === sign(s.nx) ? 1 : 0; this.vy = up * 170; this.vx = -s.nx * 60; }
    } else {
      this.magnetStuck = null;
      // 空中操舵（非反発球は接地中に左右入力で歩行しない）
      const onGround = this.grounded && this.groundN && this.groundN.ny < -0.5;
      const canSteer = !(onGround && d.kind === 'roll');
      if (canSteer) {
        if (dir) {
          if (this.vx * dir < d.airMax) this.vx = this.vx * dir + d.airAccel * control * dt > d.airMax ? d.airMax * dir : this.vx + dir * d.airAccel * control * dt;
        } else if (d.airDrag && this.launchT <= 0 && Math.abs(this.vx) <= d.airMax * 1.05) {
          this.vx -= sign(this.vx) * Math.min(Math.abs(this.vx), d.airDrag * dt);
        }
      }
      // 重力
      let gs = d.g;
      if (d.kind === 'float' && input.bounce) {
        this.vy -= d.rise * dt;
        if (this.vy < -d.riseMax) this.vy = -d.riseMax;
      }
      if (d.magnet && input.bounce) {
        const m = this.findMagnet();
        if (m) {
          const dx = m.x - this.x, dy = m.y - this.y, dd = Math.hypot(dx, dy) || 1;
          this.vx += (dx / dd) * 1700 * dt; this.vy += (dy / dd) * 1700 * dt;
          gs *= 0.25;
          g.magnetPull = m;
        }
      }
      this.vy += GRAVITY * gs * dt;
      // 風
      this.vx += this.wind.x * d.wind * dt;
      this.vy += this.wind.y * d.wind * dt;
      const maxFall = d.maxFall ?? MAX_FALL;
      if (this.vy > maxFall) this.vy = Math.max(maxFall, this.vy - 2000 * dt);
      // 地面の摩擦（非反発）
      if (onGround && (d.kind === 'roll' || d.kind === 'float')) {
        const fr = this.groundType === T.ICE ? 4 : d.kind === 'float' ? 500 : d.friction;
        this.vx -= sign(this.vx) * Math.min(Math.abs(this.vx), fr * dt);
      }
    }

    // 速度上限
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > MAX_SPEED) { this.vx *= MAX_SPEED / sp; this.vy *= MAX_SPEED / sp; }

    this.integrate(dt, input);

    // 見た目の回転
    if (!d.capsule) {
      if (this.grounded) this.spin = this.vx / d.r;
      else this.spin *= Math.pow(0.6, dt);
      this.angle += this.spin * dt;
    } else {
      this.av *= Math.pow(0.7, dt);
      this.av = clamp(this.av, -25, 25);
    }

    // 画面上端より大きく上には行けない
    if (this.y < -160) { this.y = -160; if (this.vy < 0) this.vy = 0; }
    // 落下
    if (this.y - d.r > level.ph + 40) g.onPit(this);
    else if (this.grounded && this.groundN && this.groundN.ny < -0.7 && this.invuln <= 0 && !this.forced) {
      if (this.groundType !== T.SPIKE && this.groundType !== T.LAVA) this.lastSafe = { x: this.x, y: this.y };
    }
  }

  touching(s) {
    const probe = shapeCircles(this.x - s.nx * 3, this.y - s.ny * 3, this.def, this.angle);
    return !shapeFree(this.game.level, probe, this.game.solidBoxes(), 0.5);
  }

  findMagnet() {
    const level = this.game.level;
    const R = 6;
    const cx = Math.floor(this.x / TILE), cy = Math.floor(this.y / TILE);
    let best = null, bd = 1e9;
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      if (level.tile(x, y) !== T.MAGNET) continue;
      const px = x * TILE + 8, py = y * TILE + 8;
      const dd = (px - this.x) ** 2 + (py - this.y) ** 2;
      if (dd < bd) { bd = dd; best = { x: px, y: py }; }
    }
    for (const b of this.game.solidBoxes()) {
      if (!b.magnet) continue;
      const px = clamp(this.x, b.x, b.x + b.w), py = clamp(this.y, b.y, b.y + b.h);
      const dd = (px - this.x) ** 2 + (py - this.y) ** 2;
      if (dd < bd && dd < (R * TILE) ** 2) { bd = dd; best = { x: px, y: py }; }
    }
    return bd <= (R * TILE) ** 2 ? best : null;
  }

  integrate(dt, input) {
    const g = this.game;
    const level = g.level;
    const d = this.def;
    const boxes = g.solidBoxes();
    const travel = Math.max(Math.abs(this.vx), Math.abs(this.vy)) * dt;
    const n = Math.max(1, Math.ceil(travel / Math.min(d.r * 0.5, SUBSTEP_MAX)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const prevBottom = this.y + d.r;
      this.x += this.vx * h;
      this.y += this.vy * h;
      if (d.capsule) this.angle += this.av * h;
      const contacts = resolve(level, this, d, boxes, { vy: this.vy, prevBottom }, (c) => this.consume(c));
      for (const c of contacts) this.respond(c, input);
      if (this.crushed) { this.crushed = false; this.hurt(0, -1, 'crush'); }
      if (this.captured) return;
    }
  }

  // 衝突でタイルを壊す・溶かす（押し出さない）
  consume(c) {
    const g = this.game;
    const d = this.def;
    const vn = this.vx * c.nx + this.vy * c.ny;
    if (c.type === T.HEAVY && d.heavy && -vn >= HEAVY_BREAK_SPEED && !c.box) {
      const cells = g.level.removeGroup(c.tx, c.ty, T.HEAVY);
      g.onBreak(cells, 'heavy');
      this.vx *= 0.85; this.vy *= 0.85;
      return true;
    }
    if (c.type === T.MELT && d.melt && !c.box) {
      const cells = g.level.removeGroup(c.tx, c.ty, T.MELT);
      g.onBreak(cells, 'melt');
      return true;
    }
    if (c.box && c.box.onPlayerContact && c.box.onPlayerContact(this, c, vn)) return true;
    return false;
  }

  respond(c, input) {
    const g = this.game;
    const d = this.def;
    const n = { x: c.nx, y: c.ny };
    let vn = this.vx * n.x + this.vy * n.y;
    const floor = n.y < -0.55;
    if (floor) {
      this.groundT = 0; this.groundN = { nx: n.x, ny: n.y }; this.groundType = c.type;
      if (c.box && c.box.carries) this.riding = c.box;
    }
    // 危険タイル
    if (c.type === T.SPIKE) { if (this.hurt(n.x, n.y, 'spike')) { this.vy = n.y < -0.5 ? -480 : this.vy; return; } }
    if (c.type === T.LAVA && !d.lavaProof) { if (this.hurt(n.x, n.y, 'lava')) { this.vy = -620; return; } }
    if (c.type === T.LAVA && d.lavaProof && floor) g.onLavaTouch(this);
    if (c.type === T.HEAVY && d.heavy && -vn > 60 && -vn < HEAVY_BREAK_SPEED) g.onHeavyThud(this);

    // 磁石
    if (d.magnet && c.type === T.MAGNET && input.bounce || (d.magnet && c.box && c.box.magnet && input.bounce)) {
      this.magnetStuck = { nx: n.x, ny: n.y };
      if (vn < 0) { this.vx -= vn * n.x; this.vy -= vn * n.y; }
      if (!this._magSnd) { g.onMagnetStick(this); this._magSnd = true; }
      return;
    }
    this._magSnd = false;

    // スライム：吸着（氷の上では滑る）
    if (d.kind === 'stick' && c.type !== T.ICE && this.stickCd <= 0 && !c.box?.noStick) {
      if (!this.stuck) g.onSlimeStick(this);
      this.stuck = { nx: n.x, ny: n.y };
      this.vx = 0; this.vy = 0;
      return;
    }

    if (vn >= 0 && !(floor && d.kind === 'bounce')) return;
    if (d.capsule) { this.respondCapsule(c, floor); return; }

    if (d.kind === 'bounce') {
      if (floor) {
        const base = d.bounceV * this.mult;
        const target = Math.max(base, Math.min(-vn * d.rest, d.bounceV * 1.25));
        if (vn >= target) return;
        this.vx += (target - vn) * n.x;
        this.vy += (target - vn) * n.y;
        this.squash = Math.min(1, -vn / 600 + 0.35);
        g.onBounce(this, target, c);
      } else {
        const e = n.y > 0.5 ? 0.3 : d.rest * 0.6;
        this.vx -= (1 + e) * vn * n.x;
        this.vy -= (1 + e) * vn * n.y;
        if (-vn > 120) g.onWallHit(this, -vn);
      }
      return;
    }
    // 非反発・ふわふわ・スライム（氷）
    let e = d.kind === 'float' ? 0.3 : d.rest;
    if (floor) {
      let out = -vn * e;
      if (out < 50) out = 0;
      this.vx += (out - vn) * n.x;
      this.vy += (out - vn) * n.y;
      if (-vn > 200) { this.squash = Math.min(1, -vn / 900); g.onLand(this, -vn); }
    } else {
      this.vx -= (1 + e) * vn * n.x;
      this.vy -= (1 + e) * vn * n.y;
      if (-vn > 150) g.onWallHit(this, -vn);
    }
  }

  // ラグビー球：接触点の速度と角速度を使う剛体の衝突応答
  respondCapsule(c, floor) {
    const d = this.def;
    const nx = c.nx, ny = c.ny;
    const rx = c.px - this.x, ry = c.py - this.y;
    const vcx = this.vx - this.av * ry, vcy = this.vy + this.av * rx;
    const vn = vcx * nx + vcy * ny;
    if (vn >= 0 && !floor) return;
    const rn = rx * ny - ry * nx;
    const invM = 1, invI = 1 / RUGBY_I;
    let target;
    if (floor) {
      const k = 0.8 + 0.25 * Math.abs(Math.sin(this.angle * 2.0 + this.x * 0.01));
      target = Math.max(d.bounceV * this.mult * k, Math.min(-vn * d.rest, d.bounceV * 1.2));
    } else target = -vn * d.rest * 0.6;
    const j = (target - Math.min(vn, 0)) / (invM + rn * rn * invI);
    this.vx += j * nx * invM; this.vy += j * ny * invM;
    this.av += rn * j * invI;
    // 摩擦（回転 ⇔ 並進）
    const tx = -ny, ty = nx;
    const vt = (this.vx - this.av * ry) * tx + (this.vy + this.av * rx) * ty;
    const rt = rx * ty - ry * tx;
    let jt = -vt / (invM + rt * rt * invI);
    const lim = 0.5 * Math.abs(j);
    jt = clamp(jt, -lim, lim);
    this.vx += jt * tx; this.vy += jt * ty;
    this.av += rt * jt * invI;
    if (floor) {
      const minUp = d.bounceV * this.mult * 0.55;
      if (this.vy > -minUp) this.vy = -minUp;
      this.squash = 0.4;
      this.game.onBounce(this, -this.vy, c);
    } else if (-vn > 120) this.game.onWallHit(this, -vn);
  }

  // 敵・装置からの跳ね上げ（非反発球でも敵側のインパルスを優先）
  launchUp(v, nx = 0) {
    this.stuck = null; this.magnetStuck = null;
    this.vy = -v;
    if (nx) this.vx += nx;
    this.groundT = 1;
    this.squash = 0.5;
  }
}
