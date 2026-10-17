import { STAGES, buildStage } from './stages.js';
import { BALL_ORDER, REWARD_BALLS, BONUS_BALLS, STARTING_BALLS } from './balls.js';
import { Game } from './game.js';
import { Renderer, THEMES, drawBallSprite } from './render.js';
import { BOSS_ART, heartPath, star, rrect, circ } from './art.js';
import { writeSave } from './save.js';
import { STEP } from './consts.js';

const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif';
const OUT = '#1b1b2e';

// ===== 描画ヘルパー =====
export function text(ctx, s, x, y, o = {}) {
  ctx.font = `${o.weight || 900} ${o.size || 14}px ${FONT}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  if (o.stroke !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || Math.max(3, (o.size || 14) * 0.22); ctx.strokeStyle = o.stroke || OUT; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
}
function wrap(ctx, s, maxW, size) {
  ctx.font = `700 ${size}px ${FONT}`;
  const lines = []; let cur = '';
  for (const ch of s) {
    if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}
function panel(ctx, x, y, w, h, o = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  rrect(ctx, x, y, w, h, o.r ?? 12, o.fill || 'rgba(27,27,46,0.82)', o.stroke ?? 'rgba(255,255,255,0.25)', 2);
  ctx.restore();
}

class Button {
  constructor(x, y, w, h, label, onTap, o = {}) { Object.assign(this, { x, y, w, h, label, onTap, o }); this.down = false; }
  hit(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  draw(ctx) {
    const o = this.o; const dy = this.down ? 2 : 0;
    ctx.save();
    if (o.disabled) ctx.globalAlpha = 0.45;
    rrect(ctx, this.x, this.y + 3, this.w, this.h, 12, '#00000055', null);
    rrect(ctx, this.x, this.y + dy, this.w, this.h, 12, o.color || '#ffcf3f', OUT, 2.5);
    rrect(ctx, this.x + 4, this.y + dy + 3, this.w - 8, this.h * 0.38, 8, 'rgba(255,255,255,0.35)', null);
    text(ctx, this.label, this.x + this.w / 2, this.y + this.h / 2 + dy + 1, { size: o.size || 15, color: o.textColor || '#fff' });
    ctx.restore();
  }
}

// ===== シーンの基底 =====
class Scene {
  constructor(app) { this.app = app; this.buttons = []; this.t = 0; }
  enter() {}
  leave() {}
  update(dt) { this.t += dt; }
  layout() {}
  pointer(type, id, x, y) {
    if (type === 'down') { for (const b of this.buttons) if (b.hit(x, y) && !b.o.disabled) { b.down = true; this.pressed = b; } }
    if (type === 'up') {
      const b = this.pressed; this.pressed = null;
      for (const bb of this.buttons) bb.down = false;
      if (b && b.hit(x, y)) { this.app.audio.play(b.o.sfx || 'ui'); b.onTap(); }
    }
  }
  key() {}
  bg(ctx, theme = 'grass') {
    const { W, H } = this.app;
    const th = THEMES[theme];
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// ===== タイトル =====
export class TitleScene extends Scene {
  enter() {
    this.app.audio.bgm('title');
    this.balls = [];
    const ids = BALL_ORDER;
    for (let i = 0; i < 9; i++) this.balls.push({ id: ids[i], x: 60 + i * 80, y: 100 + Math.random() * 100, vy: 0, vx: (Math.random() - 0.5) * 80 });
  }
  update(dt) {
    super.update(dt);
    const { W, H } = this.app;
    for (const b of this.balls) {
      b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > H - 40) { b.y = H - 40; b.vy = -380 - Math.random() * 160; this.app.audio.play('bounce_light', { vol: 0.15 }); }
      if (b.x < 20 || b.x > W - 20) b.vx *= -1;
    }
  }
  draw(ctx) {
    const { W, H, assets, data } = this.app;
    this.bg(ctx, 'grass');
    const bgi = this.app.assets.sprites?.bg_grass_far;
    if (bgi) { const bw = (bgi.width / bgi.height) * H, ox = -((this.t * 12) % bw); for (let x = ox; x < W; x += bw) ctx.drawImage(bgi, x, 0, bw, H); }
    // 丘
    ctx.fillStyle = '#7ccf6a'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, H - 50 - Math.sin(x / 90 + this.t * 0.2) * 12);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#5cd13a'; ctx.fillRect(0, H - 30, W, 30);
    for (const b of this.balls) drawBallSprite(ctx, assets, data.balls[b.id], b.x, b.y, this.t * b.vx * 0.05, 1.2, 1.2);
    // ロゴ
    const cy = H * 0.34 + Math.sin(this.t * 2) * 4;
    const logo = this.app.assets.sprites?.logo;
    if (logo) {
      const pop = Math.min(1, this.t * 3), sq = 1 + Math.sin(this.t * 4) * 0.015;
      const lh = 176 * (0.6 + 0.4 * pop) * sq, lw = (logo.width / logo.height) * lh / sq / sq;
      ctx.globalAlpha = pop;
      ctx.drawImage(logo, W / 2 - lw / 2, cy - lh / 2 - 4, lw, lh);
      ctx.globalAlpha = 1;
    } else {
    ctx.save();
    const g = ctx.createLinearGradient(0, cy - 40, 0, cy + 40);
    g.addColorStop(0, '#fff36b'); g.addColorStop(0.5, '#ffb92e'); g.addColorStop(1, '#ff6a3d');
    text(ctx, 'BOUNCE', W / 2, cy - 26, { size: 58, color: g, lw: 12 });
    const g2 = ctx.createLinearGradient(0, cy, 0, cy + 70);
    g2.addColorStop(0, '#9ff0ff'); g2.addColorStop(1, '#3a8cff');
    text(ctx, 'PARADE', W / 2, cy + 30, { size: 58, color: g2, lw: 12 });
    text(ctx, 'バウンスパレード', W / 2, cy + 70, { size: 14, color: '#fff' });
    ctx.restore();
    }
    text(ctx, '跳ねろ。変われ。突破しろ。', W / 2, H * 0.72, { size: 18, color: '#fff' });
    if (Math.floor(this.t * 2) % 2 === 0) text(ctx, 'タップしてスタート', W / 2, H * 0.84, { size: 16, color: '#ffe14d' });
    text(ctx, 'v1.0', W - 24, H - 12, { size: 10, stroke: false, color: 'rgba(255,255,255,0.6)' });
  }
  pointer(type) {
    if (type === 'up') { this.app.audio.unlock(); this.app.audio.play('uiStart'); this.app.tryFullscreen(); this.app.go(new SelectScene(this.app)); }
  }
  key(type, code) { if (type === 'down' && (code === 'Enter' || code === 'Space')) this.pointer('up'); }
}

// ===== ステージ選択 =====
export class SelectScene extends Scene {
  enter() { this.app.audio.bgm('select'); this.layout(); }
  layout() {
    const { W, H } = this.app;
    this.buttons = [
      new Button(14, H - 46, 120, 36, 'ボール図鑑', () => this.app.go(new CollectionScene(this.app)), { color: '#5ac8ff', size: 13 }),
      new Button(144, H - 46, 90, 36, '設定', () => this.app.go(new SettingsScene(this.app, this)), { color: '#9a8aff', size: 13 }),
    ];
    const cols = 4, gap = 10;
    const cw = Math.min(150, (W - 28 - gap * (cols - 1)) / cols), ch = 118;
    const x0 = (W - (cw * cols + gap * (cols - 1))) / 2, y0 = 50;
    this.cards = STAGES.map((st, i) => ({ st, x: x0 + (i % cols) * (cw + gap), y: y0 + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
  }
  unlocked(st) {
    const s = this.app.save;
    if (st.id === 'tutorial') return true;
    if (st.id === 'final') return STAGES.filter((x) => x.boss).every((x) => s.cleared[x.id]);
    return !!s.cleared.tutorial;
  }
  draw(ctx) {
    const { W, H, assets, data, save } = this.app;
    this.bg(ctx, 'sky');
    text(ctx, 'ステージ選択', W / 2, 24, { size: 20 });
    const bossCount = STAGES.filter((x) => x.boss && save.cleared[x.id]).length;
    text(ctx, `ボス撃破 ${bossCount}/6`, W - 16, 24, { size: 12, align: 'right', color: '#ffe14d' });
    for (const c of this.cards) {
      const { st } = c; const th = THEMES[st.theme];
      const open = this.unlocked(st);
      const down = this.pressedCard === c;
      ctx.save();
      ctx.translate(0, down ? 2 : 0);
      rrect(ctx, c.x, c.y + 3, c.w, c.h, 12, '#00000055', null);
      const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
      rrect(ctx, c.x, c.y, c.w, c.h, 12, g, OUT, 2.5);
      ctx.fillStyle = th.top; ctx.fillRect(c.x + 2, c.y + c.h - 26, c.w - 4, 6);
      ctx.fillStyle = th.body; ctx.fillRect(c.x + 2, c.y + c.h - 20, c.w - 4, 18);
      // ボスのミニ絵
      if (st.boss) {
        ctx.save(); ctx.beginPath(); ctx.rect(c.x + 2, c.y + 2, c.w - 4, c.h - 4); ctx.clip();
        const fake = { x: c.x + c.w / 2, y: c.y + c.h - 52, w: 60, h: 60, facing: -1, state: 'Idle', flash: 0, R: 30, phase2: false, g: { player: { x: 0 } }, markX: 0, under: false, armed: 1, top: c.y + 20, t: this.t };
        ctx.translate(fake.x, fake.y); ctx.scale(0.62, 0.62); ctx.translate(-fake.x, -fake.y);
        if (!open) ctx.filter = 'brightness(0)';
        BOSS_ART[st.boss](ctx, fake, this.t, c.y + c.h);
        ctx.restore();
      } else if (st.id === 'tutorial') {
        drawBallSprite(ctx, assets, data.balls.soccer, c.x + c.w / 2, c.y + c.h - 46 - Math.abs(Math.sin(this.t * 3)) * 18, this.t * 3, 1.4, 1.4);
      } else {
        ctx.save(); star(ctx, c.x + c.w / 2, c.y + c.h - 54, 22, open ? '#ffd23f' : '#333', OUT); ctx.restore();
      }
      text(ctx, st.name, c.x + c.w / 2, c.y + 16, { size: 14 });
      // 報酬
      if (st.reward) {
        const got = save.owned.includes(st.reward);
        rrect(ctx, c.x + c.w - 30, c.y + 30, 24, 24, 6, 'rgba(255,255,255,0.75)', OUT, 1.5);
        if (got) drawBallSprite(ctx, assets, { ...data.balls[st.reward], r: 8, halfLen: data.balls[st.reward].halfLen ? 5 : 0 }, c.x + c.w - 18, c.y + 42, 0);
        else text(ctx, '？', c.x + c.w - 18, c.y + 43, { size: 13, color: '#888', stroke: false });
      }
      if (save.cleared[st.id]) { star(ctx, c.x + 16, c.y + 40, 10, '#ffe14d', OUT); }
      if (!open) {
        rrect(ctx, c.x, c.y, c.w, c.h, 12, 'rgba(0,0,0,0.55)', null);
        text(ctx, '🔒', c.x + c.w / 2, c.y + c.h / 2, { size: 22, stroke: false });
        text(ctx, st.id === 'final' ? 'ボスを6体倒すと解放' : 'はじまりの丘をクリア', c.x + c.w / 2, c.y + c.h / 2 + 24, { size: 10 });
      }
      ctx.restore();
    }
    for (const b of this.buttons) b.draw(ctx);
    text(ctx, `所持ボール ${save.owned.length}/18`, W - 16, H - 28, { size: 12, align: 'right' });
  }
  pointer(type, id, x, y) {
    super.pointer(type, id, x, y);
    if (type === 'down') this.pressedCard = this.cards.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || null;
    if (type === 'up') {
      const c = this.pressedCard; this.pressedCard = null;
      if (c && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        if (!this.unlocked(c.st)) { this.app.audio.play('deny'); return; }
        this.app.audio.play('ui');
        this.app.startStage(c.st);
      }
    }
  }
}

// ===== 装備（所持が 6 個を超えたとき） =====
export class LoadoutScene extends Scene {
  constructor(app, st) { super(app); this.st = st; }
  enter() {
    const s = this.app.save;
    this.sel = (s.loadout || []).filter((id) => s.owned.includes(id)).slice(0, 6);
    if (!this.sel.includes('soccer')) this.sel.unshift('soccer');
    this.sel = this.sel.slice(0, 6);
    this.layout();
  }
  layout() {
    const { W, H } = this.app;
    this.buttons = [
      new Button(W - 140, H - 50, 124, 38, '出発！', () => this.go(), { color: '#3fdc7a', size: 16, sfx: 'uiStart' }),
      new Button(16, H - 50, 100, 38, 'もどる', () => this.app.go(new SelectScene(this.app)), { color: '#9aa0b5', size: 14, sfx: 'uiBack' }),
    ];
  }
  go() {
    const s = this.app.save;
    s.loadout = [...this.sel]; writeSave(s);
    this.app.launch(this.st, this.sel);
  }
  cells() {
    const { W } = this.app;
    const owned = BALL_ORDER.filter((id) => this.app.save.owned.includes(id));
    const cols = Math.min(9, Math.floor((W - 40) / 62));
    const x0 = (W - cols * 62) / 2 + 31;
    return owned.map((id, i) => ({ id, x: x0 + (i % cols) * 62, y: 150 + Math.floor(i / cols) * 62 }));
  }
  draw(ctx) {
    const { W, H, assets, data } = this.app;
    this.bg(ctx, THEMES[this.st.theme] ? this.st.theme : 'grass');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    text(ctx, `${this.st.name}：ボールを6つ選ぼう`, W / 2, 22, { size: 18 });
    // 選択中
    for (let i = 0; i < 6; i++) {
      const x = W / 2 + (i - 2.5) * 58, y = 74;
      circ(ctx, x, y, 24, 'rgba(255,255,255,0.2)', '#fff', 2);
      const id = this.sel[i];
      if (id) drawBallSprite(ctx, assets, { ...data.balls[id], r: 17, halfLen: data.balls[id].halfLen ? 8 : 0 }, x, y, 0);
      text(ctx, String(i + 1), x - 18, y - 18, { size: 10 });
    }
    for (const c of this.cells()) {
      const on = this.sel.includes(c.id);
      circ(ctx, c.x, c.y, 26, on ? 'rgba(255,225,77,0.45)' : 'rgba(255,255,255,0.12)', on ? '#ffe14d' : 'rgba(255,255,255,0.4)', on ? 3 : 1.5);
      drawBallSprite(ctx, assets, { ...data.balls[c.id], r: 18, halfLen: data.balls[c.id].halfLen ? 8 : 0 }, c.x, c.y - 4, 0);
      text(ctx, data.balls[c.id].name, c.x, c.y + 20, { size: 8 });
    }
    text(ctx, 'タップで付けはずし（サッカーボールは常に装備）', W / 2, H - 70, { size: 11, color: '#ddd' });
    for (const b of this.buttons) b.draw(ctx);
  }
  pointer(type, id, x, y) {
    super.pointer(type, id, x, y);
    if (type !== 'up') return;
    for (const c of this.cells()) {
      if (Math.hypot(x - c.x, y - c.y) < 28) {
        if (c.id === 'soccer') { this.app.audio.play('deny'); return; }
        if (this.sel.includes(c.id)) this.sel = this.sel.filter((s) => s !== c.id);
        else if (this.sel.length < 6) this.sel.push(c.id);
        else { this.app.audio.play('deny'); return; }
        this.app.audio.play('ui');
      }
    }
  }
}

// ===== ボール図鑑 =====
export class CollectionScene extends Scene {
  enter() { this.layout(); this.pick = null; }
  layout() {
    const { W, H } = this.app;
    this.buttons = [new Button(16, H - 50, 100, 38, 'もどる', () => this.app.go(new SelectScene(this.app)), { color: '#9aa0b5', size: 14, sfx: 'uiBack' })];
  }
  cells() {
    const { W } = this.app;
    const cols = 9, sp = Math.min(70, (W - 30) / cols);
    const x0 = (W - cols * sp) / 2 + sp / 2;
    return BALL_ORDER.map((id, i) => ({ id, x: x0 + (i % cols) * sp, y: 70 + Math.floor(i / cols) * 74 }));
  }
  draw(ctx) {
    const { W, H, assets, data, save } = this.app;
    this.bg(ctx, 'final');
    text(ctx, 'ボール図鑑', W / 2, 22, { size: 18 });
    for (const c of this.cells()) {
      const got = save.owned.includes(c.id);
      circ(ctx, c.x, c.y, 27, this.pick === c.id ? 'rgba(255,225,77,0.4)' : 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.4)', 1.5);
      ctx.save(); if (!got) ctx.filter = 'brightness(0) opacity(0.6)';
      drawBallSprite(ctx, assets, { ...data.balls[c.id], r: 19, halfLen: data.balls[c.id].halfLen ? 9 : 0 }, c.x, c.y - 3, 0);
      ctx.restore();
      text(ctx, got ? data.balls[c.id].name : '？？？', c.x, c.y + 24, { size: 8 });
    }
    const id = this.pick;
    const py = 230;
    panel(ctx, 130, py, W - 146, H - py - 14);
    if (id) {
      const d = data.balls[id]; const got = save.owned.includes(id);
      if (got) {
        drawBallSprite(ctx, assets, { ...d, r: 24, halfLen: d.halfLen ? 12 : 0 }, 170, py + 40, 0);
        text(ctx, d.name, 210, py + 22, { size: 16, align: 'left' });
        const lines = wrap(ctx, d.desc, W - 240, 12);
        lines.forEach((l, i) => text(ctx, l, 210, py + 46 + i * 17, { size: 12, align: 'left', stroke: false }));
        const kind = { bounce: '反発', roll: '非反発', float: 'ふわふわ', stick: '吸着' }[d.kind];
        text(ctx, `タイプ：${kind}　半径：${d.r}　反発係数：${d.rest}`, 210, py + 46 + lines.length * 17 + 4, { size: 10, align: 'left', stroke: false, color: '#aee' });
      } else {
        const how = STARTING_BALLS.includes(id) ? '' : REWARD_BALLS.includes(id) ? `${STAGES.find((s) => s.reward === id).name}のボスを倒すと手に入る` : 'パレードタワーをクリアすると手に入る';
        text(ctx, '？？？', 150, py + 24, { size: 16, align: 'left' });
        text(ctx, how, 150, py + 50, { size: 12, align: 'left', stroke: false });
      }
    } else text(ctx, 'ボールをタップすると説明が見られる', (130 + W - 16) / 2, py + (H - py) / 2 - 6, { size: 12, stroke: false });
    for (const b of this.buttons) b.draw(ctx);
  }
  pointer(type, id, x, y) {
    super.pointer(type, id, x, y);
    if (type === 'up') for (const c of this.cells()) if (Math.hypot(x - c.x, y - c.y) < 28) { this.pick = c.id; this.app.audio.play('ui'); }
  }
}

// ===== 設定 =====
export class SettingsScene extends Scene {
  constructor(app, back) { super(app); this.back = back; this.confirm = false; }
  enter() { this.layout(); }
  layout() {
    const { W, H } = this.app;
    const s = this.app.save.settings;
    const cx = W / 2;
    const vol = (k, d) => () => { s[k] = Math.round(Math.max(0, Math.min(1, s[k] + d)) * 10) / 10; this.app.audio.setVolume(k, s[k]); writeSave(this.app.save); if (k === 'se') this.app.audio.play('coin'); };
    this.buttons = [
      new Button(cx + 30, 70, 44, 36, '－', vol('bgm', -0.1), { color: '#9aa0b5' }),
      new Button(cx + 130, 70, 44, 36, '＋', vol('bgm', 0.1), { color: '#9aa0b5' }),
      new Button(cx + 30, 116, 44, 36, '－', vol('se', -0.1), { color: '#9aa0b5' }),
      new Button(cx + 130, 116, 44, 36, '＋', vol('se', 0.1), { color: '#9aa0b5' }),
      new Button(cx - 90, H - 100, 180, 36, this.confirm ? '本当に消す？' : 'セーブデータを消す', () => {
        if (!this.confirm) { this.confirm = true; this.layout(); return; }
        this.app.resetSave(); this.confirm = false; this.layout();
      }, { color: this.confirm ? '#ff4a5a' : '#c0506a', size: 13 }),
      new Button(16, H - 50, 100, 38, 'もどる', () => this.app.go(this.back || new SelectScene(this.app)), { color: '#9aa0b5', size: 14, sfx: 'uiBack' }),
    ];
  }
  draw(ctx) {
    const { W, H, save } = this.app;
    this.bg(ctx, 'ice');
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, W, H);
    text(ctx, '設定', W / 2, 26, { size: 20 });
    const cx = W / 2;
    text(ctx, 'BGM', cx - 60, 88, { size: 15 });
    text(ctx, `${Math.round(save.settings.bgm * 100)}%`, cx + 102, 88, { size: 15 });
    text(ctx, '効果音', cx - 60, 134, { size: 15 });
    text(ctx, `${Math.round(save.settings.se * 100)}%`, cx + 102, 134, { size: 15 });
    const lines = [
      '【スマホ】左のパッド：◀ ▶ 空中の向き／▲ 長押しで高く跳ねる／▼ 小さく跳ねる',
      '右のボールボタン：タップで即変身（空中でも地上でも）',
      '【キーボード】← → / A D：向き　↑ / W / スペース：反発　↓ / S：小さく　1〜6：変身　Esc：ポーズ',
    ];
    lines.forEach((l, i) => text(ctx, l, W / 2, 180 + i * 20, { size: 11, stroke: false }));
    for (const b of this.buttons) b.draw(ctx);
  }
}

// ===== プレイ =====
export class PlayScene extends Scene {
  constructor(app, st, loadout) { super(app); this.st = st; this.loadout = loadout; }
  enter() {
    const app = this.app;
    buildStage(this.st);
    this.events = [];
    this.game = new Game({
      stage: this.st, data: app.data, loadout: this.loadout, viewW: app.W, viewH: app.H,
      sfx: (n, o) => app.audio.play(n, o),
      onEvent: (type, p) => this.onEvent(type, p),
    });
    this.renderer = new Renderer(app.canvas, app.assets);
    this.renderer.setLevel(this.game.level, this.st.theme);
    this.levelRef = this.game.level;
    this.paused = false; this.banner = { text: this.st.name, sub: 'START!', t: 2.2 };
    this.touches = new Map();
    this.input = { left: false, right: false, down: false, bounce: false, bouncePressed: false, taps: [] };
    this.prevBounce = false;
    this.clearT = -1; this.btnShake = 0;
    app.audio.bgm(this.st.bgm);
    this.layout();
  }
  layout() {
    const { W, H } = this.app;
    this.pad = { x: 82, y: H - 82, r: 64 };
    this.ballBtns = this.loadout.map((id, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      return { id, x: W - 40 - (2 - col) * 56, y: H - 96 + row * 56, r: 25 };
    });
    // 6 個未満のときは下段から詰める
    if (this.loadout.length <= 3) this.ballBtns.forEach((b, i) => { b.x = W - 40 - (this.loadout.length - 1 - i) * 56; b.y = H - 44; });
    const leftMost = Math.min(...this.ballBtns.map((b) => b.x));
    this.bounceBtn = { x: leftMost - 66, y: H - 52, r: 28 };
    this.pauseBtn = { x: W - 24, y: 22, r: 17 };
    if (this.game) { this.game.viewW = W; this.game.viewH = H; }
    this.pauseButtons = [
      new Button(W / 2 - 90, H / 2 - 52, 180, 38, 'つづける', () => this.setPause(false), { color: '#3fdc7a' }),
      new Button(W / 2 - 90, H / 2 - 4, 180, 38, 'リトライ', () => { this.app.startStage(this.st); }, { color: '#ffcf3f' }),
      new Button(W / 2 - 90, H / 2 + 44, 180, 38, 'ステージ選択へ', () => this.app.go(new SelectScene(this.app)), { color: '#9aa0b5', sfx: 'uiBack' }),
    ];
  }
  setPause(on) {
    this.paused = on;
    this.app.audio.duck(on);
    this.touches.clear();
  }
  onEvent(type, p) {
    const g = this.game;
    if (type === 'clear') { this.clearT = p.boss ? 0.4 : 2.0; this.app.audio.jingle('clear'); }
    if (type === 'bossStart') { this.banner = { text: g.boss.name, sub: 'BOSS', t: 2.2, boss: true }; this.app.audio.bgm('boss'); }
    if (type === 'bossDefeated') { this.app.audio.stopBgm(0.3); }
    if (type === 'miss') this.banner = { text: 'ミス！', sub: 'チェックポイントから', t: 1.6 };
    if (type === 'respawn') { this.renderer.setLevel(g.level, this.st.theme); this.app.audio.bgm(this.st.bgm); this.app.audio.bgmName = this.st.bgm; }
    if (type === 'deny') this.btnShake = 0.3;
    if (type === 'forced') this.forcedT = 0;
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    const g = this.game;
    this.btnShake = Math.max(0, this.btnShake - dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    // 入力をまとめる
    const k = this.app.keys;
    const inp = this.input;
    inp.left = k.left; inp.right = k.right; inp.down = k.down; inp.bounce = k.bounce;
    for (const t of this.touches.values()) {
      if (t.kind === 'pad') { const dx = t.x - this.pad.x, dy = t.y - this.pad.y; if (dx < -12) inp.left = true; if (dx > 12) inp.right = true; if (dy < -20) inp.bounce = true; if (dy > 26 && Math.abs(dx) < 40) inp.down = true; }
      if (t.kind === 'bounce') inp.bounce = true;
    }
    inp.bouncePressed = inp.bounce && !this.prevBounce;
    this.prevBounce = inp.bounce;
    for (const id of k.taps.splice(0)) if (this.loadout[id] !== undefined) inp.taps.push(this.loadout[id]);
    for (const dir of k.cycle.splice(0)) {
      const i = this.loadout.indexOf(g.player.ball);
      inp.taps.push(this.loadout[(i + dir + this.loadout.length) % this.loadout.length]);
    }
    g.update(dt, inp);
    inp.taps.length = 0;
    if (g.level !== this.levelRef) { this.levelRef = g.level; this.renderer.setLevel(g.level, this.st.theme); }
    if (this.clearT > 0) { this.clearT -= dt; if (this.clearT <= 0) this.app.finishStage(this.st, g.result); }
  }
  draw(ctx, alpha) {
    const { W, H, S } = this.app;
    const g = this.game;
    this.renderer.draw(g, alpha, W, H, S, this.t);
    ctx.setTransform(S, 0, 0, S, 0, 0);
    this.drawHUD(ctx);
    this.drawControls(ctx);
    if (this.paused) this.drawPause(ctx);
  }
  drawHUD(ctx) {
    const { W, H, assets, data } = this.app;
    const g = this.game, p = g.player;
    // HP
    for (let i = 0; i < p.maxHp; i++) {
      ctx.save(); ctx.translate(18 + i * 22, 18);
      heartPath(ctx, 0, 0, 9);
      ctx.fillStyle = i < p.hp ? '#ff4f73' : 'rgba(0,0,0,0.35)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    }
    // コイン
    circ(ctx, 16, 42, 6, '#ffd23f', '#8a5a00', 1.5);
    text(ctx, `× ${g.coins}`, 28, 43, { size: 13, align: 'left' });
    text(ctx, `SCORE ${g.score}`, 18 + p.maxHp * 22 + 6, 19, { size: 11, align: 'left', color: '#ffe9a8' });
    // ボス HP
    if (g.boss && g.bossStarted && !g.cleared) {
      const b = g.boss; const bw = Math.min(260, W * 0.36), bx = W / 2 - bw / 2;
      text(ctx, b.name, W / 2, 14, { size: 12 });
      rrect(ctx, bx, 24, bw, 10, 4, 'rgba(0,0,0,0.5)', OUT, 2);
      const seg = bw / b.maxHp;
      for (let i = 0; i < b.hp; i++) rrect(ctx, bx + i * seg + 1.5, 25.5, seg - 3, 7, 3, b.phase2 ? '#ff4a5a' : '#ffb03a', null);
    }
    // 看板のヒント
    const sgn = g.entities.find((e) => e.type === 'sign' && Math.abs(e.x - p.x) < 60 && Math.abs(e.y - p.y) < 90);
    if (sgn) {
      const lines = wrap(ctx, sgn.text, Math.min(420, W * 0.6), 12);
      const w = Math.min(440, W * 0.62), h = 16 + lines.length * 16, x = W / 2 - w / 2, y = g.boss && g.bossStarted ? 42 : 40;
      panel(ctx, x, y, w, h, { fill: 'rgba(255,248,225,0.95)', stroke: '#c48a4a' });
      lines.forEach((l, i) => text(ctx, l, W / 2, y + 16 + i * 16, { size: 12, stroke: false, color: '#5a3a1a', weight: 700 }));
    }
    // 強制区間
    if (p.forced) {
      const d = data.balls[p.forced];
      const y = H * 0.2;
      panel(ctx, W / 2 - 92, y - 13, 184, 26, { fill: 'rgba(30,20,60,0.75)', r: 13 });
      drawBallSprite(ctx, assets, { ...d, r: 8, halfLen: d.halfLen ? 5 : 0 }, W / 2 - 74, y, 0);
      text(ctx, `強制区間：${d.name}`, W / 2 + 8, y + 1, { size: 12 });
    }
    // バナー
    if (this.banner) {
      const b = this.banner; const a = Math.min(1, b.t * 2, (2.2 - b.t) * 4 + 0.2);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      if (b.boss) { ctx.fillStyle = 'rgba(120,0,30,0.6)'; ctx.fillRect(0, H * 0.4 - 30, W, 60); }
      text(ctx, b.sub, W / 2, H * 0.4 - 14, { size: 14, color: b.boss ? '#ffcf3f' : '#fff' });
      text(ctx, b.text, W / 2, H * 0.4 + 10, { size: 26 });
      ctx.restore();
    }
    if (g.cleared && !g.result?.boss) text(ctx, 'ステージクリア！', W / 2, H * 0.35, { size: 30, color: '#ffe14d' });
    if (g.bossDefeatT > 0) text(ctx, 'ボス撃破！', W / 2, H * 0.35, { size: 30, color: '#ffe14d' });
  }
  drawControls(ctx) {
    const { assets, data } = this.app;
    const g = this.game, p = g.player;
    const touchMode = this.app.touchMode;
    // パッド
    if (touchMode) {
      const P = this.pad;
      const pt = [...this.touches.values()].find((t) => t.kind === 'pad');
      ctx.save(); ctx.globalAlpha = 0.5;
      circ(ctx, P.x, P.y, P.r, 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.6)', 2);
      ctx.restore();
      const arrow = (x, y, rot, on) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = on ? 0.95 : 0.6; ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(9, 0); ctx.lineTo(-9, 11); ctx.closePath(); ctx.fillStyle = on ? '#ffe14d' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); };
      arrow(P.x - 38, P.y, Math.PI, this.input.left);
      arrow(P.x + 38, P.y, 0, this.input.right);
      arrow(P.x, P.y - 40, -Math.PI / 2, this.input.bounce);
      ctx.save(); ctx.scale(1, 1); arrow(P.x, P.y + 42, Math.PI / 2, this.input.down); ctx.restore();
      if (pt) { circ(ctx, pt.x, pt.y, 16, 'rgba(255,255,255,0.35)', '#fff', 2); }
      // 反発ボタン（右）
      const B = this.bounceBtn;
      ctx.save(); ctx.globalAlpha = 0.75;
      circ(ctx, B.x, B.y, B.r, this.input.bounce ? 'rgba(255,225,77,0.7)' : 'rgba(255,255,255,0.25)', '#fff', 2.5);
      text(ctx, '▲', B.x, B.y - 1, { size: 20 });
      ctx.restore();
    }
    // ボールボタン
    const shake = this.btnShake > 0 ? Math.sin(this.btnShake * 80) * 3 : 0;
    for (const b of this.ballBtns) {
      const active = p.ball === b.id;
      const d = data.balls[b.id];
      ctx.save();
      ctx.translate(shake, 0);
      circ(ctx, b.x, b.y, b.r, active ? 'rgba(255,225,77,0.55)' : 'rgba(20,20,40,0.45)', active ? '#ffe14d' : 'rgba(255,255,255,0.7)', active ? 3.5 : 2);
      if (p.forced) ctx.globalAlpha = 0.4;
      drawBallSprite(ctx, assets, { ...d, r: 16, halfLen: d.halfLen ? 8 : 0 }, b.x, b.y, 0);
      ctx.globalAlpha = 1;
      if (p.queue && p.queue.id === b.id) circ(ctx, b.x, b.y, b.r + 3, null, '#7dfcff', 2);
      if (!touchMode) text(ctx, String(this.loadout.indexOf(b.id) + 1), b.x - b.r + 4, b.y - b.r + 6, { size: 10 });
      ctx.restore();
      if (p.forced) text(ctx, '🔒', b.x + 12, b.y - 14, { size: 11, stroke: false });
    }
    // 切り替え CD ゲージ
    if (this.ballBtns.length) {
      const xs = this.ballBtns.map((b) => b.x), ys = this.ballBtns.map((b) => b.y);
      const x0 = Math.min(...xs) - 25, x1 = Math.max(...xs) + 25, y = Math.min(...ys) - 34;
      const k = p.cd / p.cdMax;
      rrect(ctx, x0, y, x1 - x0, 5, 2.5, 'rgba(0,0,0,0.35)', null);
      rrect(ctx, x0, y, (x1 - x0) * (1 - k), 5, 2.5, k > 0 ? '#7dd3ff' : '#7dffb0', null);
    }
    // ポーズ
    const Q = this.pauseBtn;
    circ(ctx, Q.x, Q.y, Q.r, 'rgba(20,20,40,0.5)', '#fff', 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(Q.x - 6, Q.y - 7, 4, 14); ctx.fillRect(Q.x + 2, Q.y - 7, 4, 14);
  }
  drawPause(ctx) {
    const { W, H } = this.app;
    ctx.fillStyle = 'rgba(10,10,30,0.6)'; ctx.fillRect(0, 0, W, H);
    text(ctx, 'ポーズ', W / 2, H / 2 - 90, { size: 24 });
    for (const b of this.pauseButtons) b.draw(ctx);
  }
  pointer(type, id, x, y) {
    if (this.paused) {
      this.buttons = this.pauseButtons;
      super.pointer(type, id, x, y);
      return;
    }
    if (type === 'down') {
      if (Math.hypot(x - this.pauseBtn.x, y - this.pauseBtn.y) < this.pauseBtn.r + 8) { this.setPause(true); this.app.audio.play('ui'); return; }
      for (const b of this.ballBtns) {
        if (Math.hypot(x - b.x, y - b.y) < b.r + 4) { this.input.taps.push(b.id); this.touches.set(id, { kind: 'ball', x, y }); return; }
      }
      if (Math.hypot(x - this.bounceBtn.x, y - this.bounceBtn.y) < this.bounceBtn.r + 8) { this.touches.set(id, { kind: 'bounce', x, y }); return; }
      if (x < this.app.W * 0.45 && y > 60) { this.touches.set(id, { kind: 'pad', x, y }); return; }
    } else if (type === 'move') {
      const t = this.touches.get(id); if (t) { t.x = x; t.y = y; }
    } else if (type === 'up') this.touches.delete(id);
  }
  key(type, code) {
    if (type === 'down' && (code === 'Escape' || code === 'KeyP')) { this.setPause(!this.paused); }
  }
  leave() { this.app.audio.duck(false); }
}

// ===== 結果 =====
export class ResultScene extends Scene {
  constructor(app, st, result, newBall) { super(app); this.st = st; this.result = result; this.newBall = newBall; }
  enter() {
    const { W, H } = this.app;
    if (this.newBall) setTimeout(() => this.app.audio.play('reward'), 400);
    this.layout();
  }
  layout() {
    const { W, H } = this.app;
    this.buttons = [
      new Button(W / 2 - 200, H - 56, 190, 40, 'ステージ選択へ', () => this.app.go(new SelectScene(this.app)), { color: '#3fdc7a' }),
      new Button(W / 2 + 10, H - 56, 190, 40, 'もう一度', () => this.app.startStage(this.st), { color: '#ffcf3f' }),
    ];
  }
  draw(ctx) {
    const { W, H, assets, data } = this.app;
    this.bg(ctx, this.st.theme);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    text(ctx, 'ステージクリア！', W / 2, 36, { size: 28, color: '#ffe14d' });
    text(ctx, this.st.name, W / 2, 66, { size: 14 });
    const r = this.result;
    const m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
    const rows = [['コイン', `${r.coins}`], ['タイム', `${m}:${String(s).padStart(2, '0')}`], ['スコア', `${r.score}`]];
    const left = this.newBall ? W / 2 - 180 : W / 2 - 80;
    rows.forEach(([k, v], i) => { text(ctx, k, left, 104 + i * 30, { size: 15, align: 'left' }); text(ctx, v, left + 160, 104 + i * 30, { size: 15, align: 'right', color: '#ffe9a8' }); });
    if (this.newBall) {
      const d = data.balls[this.newBall];
      const cx = W / 2 + 110, cy = 140;
      const k = Math.min(1, this.t * 2);
      ctx.save(); ctx.globalAlpha = 0.5;
      for (let i = 0; i < 12; i++) { const a = this.t + (i / 12) * Math.PI * 2; ctx.fillStyle = i % 2 ? '#fff36b' : '#fff'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 70, a, a + 0.18); ctx.fill(); }
      ctx.restore();
      drawBallSprite(ctx, assets, { ...d, r: 34 * k, halfLen: d.halfLen ? 18 * k : 0 }, cx, cy + Math.sin(this.t * 3) * 4, 0);
      text(ctx, `${d.name} を手に入れた！`, cx, cy + 60, { size: 16, color: '#7dffb0' });
      const lines = wrap(ctx, d.desc, 240, 11);
      lines.forEach((l, i) => text(ctx, l, cx, cy + 82 + i * 15, { size: 11, stroke: false }));
    }
    for (const b of this.buttons) b.draw(ctx);
  }
}

// ===== エンディング =====
export class EndingScene extends Scene {
  enter() {
    this.app.audio.bgm('title');
    const { W, H } = this.app;
    this.buttons = [new Button(W / 2 - 95, H - 54, 190, 40, 'ステージ選択へ', () => this.app.go(new SelectScene(this.app)), { color: '#3fdc7a' })];
    this.fw = [];
  }
  update(dt) {
    super.update(dt);
    const { W, H } = this.app;
    if (Math.random() < dt * 3) { const x = Math.random() * W, y = 40 + Math.random() * H * 0.4, c = ['#ff7ab0', '#ffd23f', '#6ad0ff', '#7dffb0'][Math.floor(Math.random() * 4)]; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; this.fw.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 1.2, c }); } }
    for (const f of this.fw) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 60 * dt; f.life -= dt; }
    this.fw = this.fw.filter((f) => f.life > 0);
  }
  draw(ctx) {
    const { W, H, assets, data } = this.app;
    this.bg(ctx, 'final');
    for (const f of this.fw) { ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.c; ctx.fillRect(f.x, f.y, 2.5, 2.5); }
    ctx.globalAlpha = 1;
    text(ctx, 'CONGRATULATIONS!', W / 2, 40, { size: 30, color: '#ffe14d' });
    text(ctx, 'パレードタワーを突破した！', W / 2, 74, { size: 16 });
    text(ctx, '追加ボール 9 種が図鑑に加わった', W / 2, 98, { size: 13, color: '#7dffb0' });
    BONUS_BALLS.forEach((id, i) => {
      const x = W / 2 + (i - 4) * 52, y = 150 + Math.sin(this.t * 3 + i) * 8;
      drawBallSprite(ctx, assets, { ...data.balls[id], r: 18, halfLen: data.balls[id].halfLen ? 8 : 0 }, x, y, this.t * (i % 2 ? 1 : -1));
    });
    text(ctx, 'BOUNCE PARADE — 企画・開発キット v1.0 / BGM・効果音：かなでる', W / 2, H - 82, { size: 10, stroke: false, color: '#ddd' });
    for (const b of this.buttons) b.draw(ctx);
  }
}

export { STEP };
