import { Builder } from '../js/level.js';
import { Game } from '../js/game.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
function mk(fn) { const b = new Builder(26); b.ground(0, 80, 22); fn && fn(b); return { id: 't', built: { rows: b.toRows(), extra: b.extra }, theme: 'grass' }; }
function run(stage, ball, frames, inp, log) {
  const g = new Game({ stage, data, loadout: [ball, 'marble', 'bowling', 'pingpong', 'soccer'] });
  let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < frames; i++) { const input = { ...noInput(), ...(inp ? inp(i, g) : {}) }; g.update(1 / 60, input); if (i > 120) { minY = Math.min(minY, g.player.y); maxY = Math.max(maxY, g.player.y); } if (log && i % log === 0) console.log(i, g.player.x.toFixed(1), g.player.y.toFixed(1), g.player.vx.toFixed(0), g.player.vy.toFixed(0), g.player.state, g.player.ball); }
  return { g, minY, maxY };
}
const s1 = mk((b) => b.set(5, 20, 'P'));
for (const [ball, hold] of [['soccer', false], ['soccer', true], ['pingpong', true], ['marble', false], ['bowling', false], ['rugby', true]]) {
  const r = run(s1, ball, 600, () => ({ bounce: hold }));
  console.log(ball, hold ? 'hold' : 'tap', 'apex height(px)=', (r.maxY - r.minY).toFixed(1), 'state', r.g.player.state, 'x', r.g.player.x.toFixed(1), 'floorTop', 22 * 16, 'y', r.g.player.y.toFixed(1));
}
// transform marble -> bowling on ground
const r2 = run(s1, 'marble', 200, (i) => (i === 100 ? { taps: ['bowling'] } : {}));
console.log('marble->bowling y', r2.g.player.y.toFixed(2), r2.g.player.ball, 'expected', 22 * 16 - 24);
// resting marble then soccer kick
const r3 = run(s1, 'marble', 300, (i) => (i === 100 ? { taps: ['soccer'] } : {}), 0);
console.log('marble->soccer state', r3.g.player.state, 'apex', (r3.maxY - r3.minY).toFixed(1));
