// ブロックの角に当たったときの跳ね返りを測る
import { Builder } from '../js/level.js';
import { Game } from '../js/game.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
const b = new Builder(26); b.ground(0, 60, 22); b.ground(20, 29, 16); b.set(3, 21, 'P');
const st = { id: 't', theme: 'grass', built: { rows: b.toRows(), extra: [], zones: [] } };
let worst = 0;
for (const ball of ['soccer', 'pingpong', 'basketball', 'rugby']) {
  const row = [];
  for (const off of [-24, -20, -16, -12, -8, -4, 0]) { // 角（x=320）からの横のずれ
    const g = new Game({ stage: st, data, loadout: [ball] });
    const p = g.player; p.setBall(ball);
    p.x = 20 * 16 + off; p.y = 16 * 16 - 120; p.vx = 0; p.vy = 0; p.angle = 0; p.av = 0;
    let maxVx = 0;
    for (let f = 0; f < 70; f++) { g.update(1 / 60, { ...noInput(), bounce: true }); maxVx = Math.max(maxVx, Math.abs(p.vx)); }
    row.push(maxVx.toFixed(0).padStart(4));
    worst = Math.max(worst, maxVx);
  }
  console.log(ball.padEnd(10), row.join(' '), `  (操作での最高速 ${data.balls[ball].airMax})`);
}
console.log('最大の横速度', worst.toFixed(0));
