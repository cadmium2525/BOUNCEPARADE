// BGM・効果音（「かなでる」で制作した音源を Web Audio で再生）
const ALIAS = {
  bounce_soccer: 'bounce', bounce_fire: 'bounce', bounce_basketball: 'bounce', bounce_baseball: 'bounce', bounce_golf: 'bounce_light',
  bounce_pingpong: 'bounce_light', bounce_tennis: 'bounce_light', bounce_volleyball: 'bounce_light', bounce_beach: 'bounce_light',
  bounce_magnet: 'bounce_metal', bounce_rugby: 'bounce_rugby',
  heavyLand: 'heavy', thud: 'heavy', land: 'land', wall: 'land', crash: 'heavy', rock: 'land', press: 'heavy', slam: 'heavy',
  heart: 'item', checkpoint: 'checkpoint', capture: 'click', launch: 'launch', spring: 'spring', bumper: 'bumper', switch: 'switch', door: 'door', gate: 'door',
  stomp: 'stomp', smash: 'break', break: 'break', melt: 'melt', sizzle: 'melt', armor: 'armor', purun: 'spring', cannon: 'cannon', reflect: 'reflect',
  hurt: 'hurt', miss: 'miss', fall: 'miss', morph: 'morph', deny: 'deny', forced: 'forced', magnet: 'magnet', slime: 'slime', slimeJump: 'slime',
  bossHit: 'bossHit', bossDown: 'bossDown', explode: 'explode', phase2: 'bossWarn', bossWarn: 'bossWarn', charge: 'charge', thunder: 'thunder', thunderWarn: 'charge',
  windShift: 'wind', tired: 'deny', puff: 'land', cool: 'freeze', freeze: 'freeze', reheat: 'melt', web: 'cannon', spiderTurn: 'click', jump: 'spring',
  rumble: 'charge', drill: 'break', stun: 'bossHit', clamp: 'switch', icePillar: 'freeze', iceShot: 'cannon', shield: 'armor',
  goal: 'goal', pop: 'bounce_light', coin: 'coin', ui: 'ui', uiBack: 'uiBack', uiStart: 'uiStart', reward: 'reward',
};

export class AudioManager {
  constructor() {
    this.ctx = null; this.buffers = {}; this.manifest = null; this.loading = {};
    this.bgmName = null; this.bgmSrc = null; this.bgmGain = null;
    this.vol = { bgm: 0.7, se: 0.9 };
    this.lastPlay = {};
  }
  async init(manifestUrl) {
    try { this.manifest = await (await fetch(manifestUrl)).json(); } catch { this.manifest = { bgm: {}, se: {} }; }
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.seBus = this.ctx.createGain(); this.seBus.gain.value = this.vol.se; this.seBus.connect(this.master);
      this.bgmBus = this.ctx.createGain(); this.bgmBus.gain.value = this.vol.bgm; this.bgmBus.connect(this.master);
      for (const n of Object.keys(this.manifest.se || {})) this.load('se', n);
      if (this.pendingBgm) { const b = this.pendingBgm; this.pendingBgm = null; this.bgm(b); }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  setVolume(kind, v) {
    this.vol[kind] = v;
    if (kind === 'se' && this.seBus) this.seBus.gain.value = v;
    if (kind === 'bgm' && this.bgmBus) this.bgmBus.gain.value = v;
  }
  load(kind, name) {
    const key = kind + ':' + name;
    if (this.buffers[key] || this.loading[key]) return this.loading[key];
    const ent = this.manifest[kind]?.[name];
    if (!ent || !this.ctx) return null;
    const file = typeof ent === 'string' ? ent : ent.file;
    this.loading[key] = fetch(file).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { this.buffers[key] = buf; return buf; }).catch(() => null);
    return this.loading[key];
  }
  play(name, o = {}) {
    if (!this.ctx) return;
    const n = this.manifest.se?.[name] ? name : ALIAS[name] && this.manifest.se?.[ALIAS[name]] ? ALIAS[name] : null;
    if (!n) return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[n] && now - this.lastPlay[n] < 0.035) return; // 同じ音の多重再生を抑える
    this.lastPlay[n] = now;
    const buf = this.buffers['se:' + n];
    if (!buf) { this.load('se', n); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate || 1;
    const g = this.ctx.createGain(); g.gain.value = o.vol ?? 1;
    src.connect(g); g.connect(this.seBus);
    src.start();
  }
  async bgm(name, fade = 0.6) {
    if (name === this.bgmName) return;
    if (!this.ctx) { this.pendingBgm = name; return; }
    this.bgmName = name;
    this.stopBgm(fade);
    if (!name) return;
    const ent = this.manifest.bgm?.[name];
    if (!ent) return;
    const buf = await this.load('bgm', name);
    if (!buf || this.bgmName !== name) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (ent.loop !== false) {
      src.loop = true;
      if (ent.loopStart != null) { src.loopStart = ent.loopStart; src.loopEnd = Math.min(ent.loopEnd, buf.duration); }
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(ent.gain ?? 1, this.ctx.currentTime + 0.3);
    src.connect(g); g.connect(this.bgmBus);
    src.start();
    this.bgmSrc = src; this.bgmGain = g;
  }
  stopBgm(fade = 0.5) {
    if (this.bgmSrc && this.ctx) {
      const s = this.bgmSrc, g = this.bgmGain, t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
      s.stop(t + fade + 0.05);
    }
    this.bgmSrc = null;
  }
  // ジングル（ループしない BGM）
  jingle(name) { this.bgmName = null; return this.bgm(name, 0.2).then(() => { this.bgmName = '__jingle'; }); }
  duck(on) { if (this.bgmBus) this.bgmBus.gain.setTargetAtTime(on ? this.vol.bgm * 0.35 : this.vol.bgm, this.ctx.currentTime, 0.1); }
}
