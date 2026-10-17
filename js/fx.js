// パーティクルと浮かぶ文字（ロジックのみ。描画は render.js）
export class FX {
  constructor() { this.parts = []; this.texts = []; }
  add(p) { if (this.parts.length < 600) this.parts.push(p); }
  burst(x, y, n, color, speed = 160, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.35 + Math.random() * 0.65);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.up || 40), life: 0.35 + Math.random() * 0.35, max: 0.7, size: opts.size || 2 + Math.random() * 2, color, g: opts.g ?? 500, shape: opts.shape || 'sq' });
    }
  }
  dust(x, y, n = 6) {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * 16, y: y - 2, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 60, life: 0.4 + Math.random() * 0.3, max: 0.7, size: 3 + Math.random() * 3, color: 'rgba(255,255,255,0.75)', g: -40, shape: 'circle' });
  }
  debris(cells, tile, color) {
    for (const c of cells) for (let i = 0; i < 4; i++) {
      this.add({ x: c.x * tile + Math.random() * tile, y: c.y * tile + Math.random() * tile, vx: (Math.random() - 0.5) * 380, vy: -150 - Math.random() * 300, life: 0.8 + Math.random() * 0.5, max: 1.3, size: 3 + Math.random() * 4, color, g: 1300, shape: 'sq', spin: (Math.random() - 0.5) * 20 });
    }
  }
  steam(cells, tile) {
    for (const c of cells) for (let i = 0; i < 3; i++) this.add({ x: c.x * tile + Math.random() * tile, y: c.y * tile + Math.random() * tile, vx: (Math.random() - 0.5) * 50, vy: -60 - Math.random() * 80, life: 0.8 + Math.random() * 0.6, max: 1.4, size: 5 + Math.random() * 6, color: 'rgba(230,245,255,0.7)', g: -30, shape: 'circle' });
  }
  snow(x, y) { this.add({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.5, max: 0.5, size: 3, color: '#dff6ff', g: 0, shape: 'circle' }); }
  trail(x, y, r, color) { this.add({ x, y, vx: 0, vy: 0, life: 0.18, max: 0.18, size: r, color, g: 0, shape: 'ring' }); }
  morph(x, y, r) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.add({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3, max: 0.3, size: 3, color: '#fff7c2', g: 0, shape: 'star' });
    }
  }
  text(x, y, s, color = '#fff', size = 12) { this.texts.push({ x, y, s, color, size, life: 1, max: 1 }); }
  update(dt) {
    for (const p of this.parts) {
      p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 30 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
}
