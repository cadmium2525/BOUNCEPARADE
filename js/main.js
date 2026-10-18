import { buildBallDefs, BALL_ORDER } from './balls.js';
import { analyzeAtlas, Renderer } from './render.js';
import { loadSprites } from './sprites.js';
import { AudioManager } from './audio.js';
import { loadSave, writeSave, defaultSave, maxSlots } from './save.js';
import { TOTAL_MEDALS } from './stages.js';
import { STAGES, buildStage } from './stages.js';
import { Game } from './game.js';
import { ENTITY_ART, BOSS_ART } from './art.js';
import { TitleScene, SelectScene, LoadoutScene, PlayScene, ResultScene, EndingScene } from './ui.js';
import { STEP, VIEW_H } from './consts.js';

const params = new URLSearchParams(location.search);

const loadJSON = (u) => fetch(u).then((r) => r.json());
const loadImage = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.keys = { left: false, right: false, down: false, bounce: false, taps: [], cycle: [] };
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.save = loadSave();
    this.audio = new AudioManager();
  }

  async boot() {
    const [ballsAtlas, rules, enemyRules, bossRules, ballsImg] = await Promise.all([
      loadJSON('assets/atlas/balls_atlas.json'), loadJSON('assets/data/game_rules.json'),
      loadJSON('assets/data/enemies.json'), loadJSON('assets/data/bosses.json'),
      loadImage('assets/atlas/balls_atlas.png'),
    ]);
    this.data = { balls: buildBallDefs(ballsAtlas), rules, enemyRules, bossRules };
    this.assets = { ballsImg, ballInfo: ballsImg ? analyzeAtlas(ballsImg, ballsAtlas) : null, sprites: await loadSprites('assets/sprites/manifest.json') };
    await this.audio.init('audio/manifest.json');
    this.audio.setVolume('bgm', this.save.settings.bgm);
    this.audio.setVolume('se', this.save.settings.se);
    try { await Promise.race([document.fonts.load('900 20px "M PLUS Rounded 1c"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* フォントなしでも動く */ }
    if (params.get('unlock')) { this.save.owned = [...BALL_ORDER]; STAGES.forEach((s) => { this.save.cleared[s.id] = this.save.cleared[s.id] || { score: 0 }; }); }
    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindInput();
    document.getElementById('loading')?.remove();
    if (params.get('map')) return this.drawMap(params.get('map'));
    if (params.get('stage')) { const st = STAGES.find((s) => s.id === params.get('stage')); if (st) { this.startStage(st); this.loop(); return; } }
    this.go(new TitleScene(this));
    this.loop();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = window.innerWidth, ch = window.innerHeight;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    this.dpr = dpr;
    this.S = this.canvas.height / VIEW_H;
    this.H = VIEW_H;
    this.W = this.canvas.width / this.S;
    this.portrait = ch > cw;
    if (this.scene) this.scene.layout();
  }

  go(scene) {
    if (this.scene) this.scene.leave();
    this.scene = scene;
    scene.enter();
  }

  get slots() { return maxSlots(this.save, TOTAL_MEDALS); }
  defaultLoadout(st) {
    const n = this.slots;
    const owned = BALL_ORDER.filter((id) => this.save.owned.includes(id));
    let lo = owned.slice(0, n);
    for (const id of st.trial || []) if (!lo.includes(id) && lo.length < n) lo.push(id);
    for (const id of st.required || []) if (!lo.includes(id)) { if (lo.length >= n) lo.pop(); lo.push(id); }
    return lo;
  }
  startStage(st) {
    if (this.save.owned.length > this.slots) this.go(new LoadoutScene(this, st));
    else this.launch(st, this.defaultLoadout(st));
  }
  launch(st, loadout) {
    const lo = [...loadout];
    for (const id of st.required || []) if (!lo.includes(id)) { if (lo.length >= this.slots) lo.pop(); lo.push(id); }
    this.go(new PlayScene(this, st, lo));
  }
  finishStage(st, result) {
    const s = this.save;
    const prev = s.cleared[st.id];
    s.cleared[st.id] = { score: Math.max(prev?.score || 0, result.score), coins: Math.max(prev?.coins || 0, result.coins), time: Math.min(prev?.time ?? 1e9, result.time) };
    let newBall = null;
    if (result.reward && !s.owned.includes(result.reward)) { s.owned.push(result.reward); newBall = result.reward; }
    writeSave(s);
    if (st.id === 'final' && newBall) { this.go(new EndingScene(this)); return; } // 初回クリアはエンディング
    this.go(new ResultScene(this, st, result, newBall));
  }
  resetSave() { this.save = defaultSave(); writeSave(this.save); this.audio.play('uiBack'); }
  tryFullscreen() {
    const el = document.documentElement;
    if (this.touchMode && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }

  bindInput() {
    const c = this.canvas;
    const pos = (e) => ({ x: (e.clientX * this.dpr) / this.S, y: (e.clientY * this.dpr) / this.S });
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') this.touchMode = true;
      this.audio.unlock();
      c.setPointerCapture?.(e.pointerId);
      const p = pos(e); this.scene?.pointer('down', e.pointerId, p.x, p.y);
    });
    c.addEventListener('pointermove', (e) => { const p = pos(e); this.scene?.pointer('move', e.pointerId, p.x, p.y); });
    const up = (e) => { const p = pos(e); this.scene?.pointer('up', e.pointerId, p.x, p.y); };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    const map = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'bounce', KeyW: 'bounce', Space: 'bounce', KeyZ: 'bounce' };
    addEventListener('keydown', (e) => {
      if (e.repeat && !map[e.code]) return;
      this.touchMode = false;
      this.audio.unlock();
      if (map[e.code]) { this.keys[map[e.code]] = true; e.preventDefault(); }
      if (/^Digit[1-6]$/.test(e.code)) this.keys.taps.push(Number(e.code.slice(5)) - 1);
      if (e.code === 'KeyQ') this.keys.cycle.push(-1);
      if (e.code === 'KeyE') this.keys.cycle.push(1);
      this.scene?.key('down', e.code);
    });
    addEventListener('keyup', (e) => { if (map[e.code]) this.keys[map[e.code]] = false; });
    addEventListener('blur', () => { for (const k of ['left', 'right', 'down', 'bounce']) this.keys[k] = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.scene instanceof PlayScene && !this.scene.paused) this.scene.setPause(true);
      if (this.audio.ctx) document.hidden ? this.audio.ctx.suspend() : this.audio.ctx.resume();
    });
  }

  loop() {
    let last = performance.now(), acc = 0;
    const frame = (now) => {
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) { this.scene.update(STEP); acc -= STEP; n++; }
      if (n === 6) acc = 0;
      this.draw(acc / STEP);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  draw(alpha) {
    const ctx = this.ctx;
    if (this.portrait && this.touchMode) { this.drawRotatePrompt(); return; }
    ctx.setTransform(this.S, 0, 0, this.S, 0, 0);
    ctx.imageSmoothingEnabled = true;
    this.scene.draw(ctx, alpha);
  }

  // 縦向きの案内：画面の幅を基準に、ほどよい大きさで描く
  drawRotatePrompt() {
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    const k = cw / 360; // 幅 360 の論理座標
    const W = 360, H = ch / k, t = performance.now() / 1000;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1b46'); g.addColorStop(1, '#3a2470');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const logo = this.assets?.sprites?.logo;
    if (logo) { const lw = 260, lh = (logo.height / logo.width) * lw; ctx.drawImage(logo, W / 2 - lw / 2, H * 0.22 - lh / 2, lw, lh); }
    // スマホのアイコンが横に倒れるアニメーション
    const phase = (t % 2.4) / 2.4;
    const rot = phase < 0.25 ? 0 : phase < 0.55 ? ((phase - 0.25) / 0.3) * (Math.PI / 2) : Math.PI / 2;
    ctx.save(); ctx.translate(W / 2, H * 0.52); ctx.rotate(rot);
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-30, -52, 60, 104, 12) : ctx.rect(-30, -52, 60, 104); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(-10, 40, 20, 4);
    ctx.restore();
    ctx.fillStyle = '#ffe14d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 20px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('横向きにしてあそんでね', W / 2, H * 0.72);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '700 12px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('画面の向きのロックを解除してください', W / 2, H * 0.72 + 28);
  }

  // 開発用：ステージ全体を1枚に描く（?map=factory）
  drawMap(id) {
    const st = buildStage(STAGES.find((s) => s.id === id));
    const g = new Game({ stage: st, data: this.data, loadout: ['soccer', 'marble', 'pingpong'] });
    const r = new Renderer(this.canvas, this.assets);
    r.setLevel(g.level, st.theme);
    const k = Number(params.get('scale') || 0.5);
    const W = g.level.pw * k, H = g.level.ph * k;
    this.canvas.width = W; this.canvas.height = H;
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
    const ctx = this.ctx;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = '#8fd0ff'; ctx.fillRect(0, 0, g.level.pw, g.level.ph);
    for (let cy = 0; cy * 512 < g.level.ph; cy++) for (let cx = 0; cx * 512 < g.level.pw; cx++) ctx.drawImage(r.getChunk(cx, cy), cx * 512, cy * 512);
    r.ctx = ctx;
    r.drawDynamicTiles(g, 0, 0, g.level.pw, g.level.ph, 0);
    for (const e of g.entities) { const fn = ENTITY_ART[e.type]; if (fn) fn(ctx, e, 0); if (e.type === 'platform') { ctx.fillStyle = '#fff'; ctx.fillRect(e.left, e.top, e.w, e.h); } }
    if (g.boss) BOSS_ART[g.boss.id](ctx, g.boss, 0, g.arena.floor);
    r.drawPlayer(g, g.player, 1, 0.3);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1 / k;
    for (let x = 0; x < g.level.w; x += 10) { ctx.beginPath(); ctx.moveTo(x * 16, 0); ctx.lineTo(x * 16, g.level.ph); ctx.stroke(); ctx.fillStyle = '#000'; ctx.font = `${10 / k}px sans-serif`; ctx.fillText(String(x), x * 16 + 2, 12 / k); }
    window.__mapDone = true;
  }
}

const app = new App();
window.__app = app;
app.boot();
