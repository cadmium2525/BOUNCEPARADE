// 各ボスを初期3球だけで倒せるかを簡易ボットで確認する
import { STAGES, buildStage } from '../js/stages.js';
import { Game } from '../js/game.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
const only = process.argv[2];
for (const st0 of STAGES.filter((s) => s.boss && (!only || s.id === only))) {
  const st = buildStage(st0);
  let wins = 0, total = 0, hits = 0;
  for (let trial = 0; trial < 5; trial++) {
    const g = new Game({ stage: st, data, loadout: ['soccer', 'marble', 'pingpong'] });
    const A = g.arena;
    // ボス部屋の入口に置く
    g.player.x = A.x0 + 70; g.player.y = A.floor - 30; g.player.setBall(trial % 2 ? 'pingpong' : 'soccer');
    let misses = 0; const hurts = []; g.opts.onEvent = (t, pl) => { if (t === 'miss') misses++; if (t === 'hurt') hurts.push((g.time).toFixed(1) + ':' + g.boss.state + '@' + (g.player.x / 16).toFixed(0) + ',' + (g.player.y / 16).toFixed(1)); }; g.opts.sfx = (n) => { if (['hurt','fall'].includes(n)) hurts.push(n); };
    let f;
    for (f = 0; f < 60 * 180; f++) {
      const p = g.player, b = g.boss;
      const inp = { ...noInput(), bounce: true };
      let tx = p.x;
      if (b && g.bossStarted && !b.dead) {
        const wp = b.weakPoint;
        if (b.id === 'magma_golem' && b.state !== 'Vulnerable') {
          const sw = g.entities.filter((e) => e.type === 'switch' && !e.pressed).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x))[0];
          tx = sw ? sw.x + (p.y > sw.y + 10 ? (sw.x < (A.x0 + A.x1) / 2 ? 70 : -70) : 0) : (b.x < (A.x0 + A.x1) / 2 ? A.x1 - 60 : A.x0 + 60);
        } else if (b.id === 'mogu_driller' && b.state !== 'Vulnerable') {
          const sw = g.entities.filter((e) => e.type === 'switch' && !e.pressed).sort((a, c) => Math.abs(a.x - p.x) - Math.abs(c.x - p.x))[0];
          const side = sw && p.y > sw.y + 10 ? (sw.x < (A.x0 + A.x1) / 2 ? 70 : -70) : 0;
          tx = b.state === 'Surface' && sw ? sw.x + side : (sw ? sw.x + (sw.x < b.x ? 30 : -30) + side : p.x);
        } else if (b.id === 'bumper_spider' || b.id === 'freeze_king') {
          tx = b.x - b.facing * 60;
          if (Math.abs(p.x - tx) > 40 && Math.sign(p.x - b.x) === b.facing) inp.bounce = true;
        } else if (wp) tx = wp.x;
        else tx = Math.abs(p.x - b.x) < 160 ? p.x + Math.sign(p.x - b.x || 1) * 100 : p.x;
        if (b.id === 'storm_cloud' && (b.state === 'Vulnerable' || b.state === 'Recovery') && p.ball !== 'pingpong') inp.taps = ['pingpong'];
      }
      if (tx > p.x + 6) inp.right = true; else if (tx < p.x - 6) inp.left = true;
      if (process.env.GOD) g.player.invuln = Math.max(g.player.invuln, 0.05);
      g.update(1 / 60, inp);
      if (process.env.TRACE && f % 30 === 0 && f < 1200) console.log((f/60).toFixed(1), 'p', (p.x/16).toFixed(1), (p.y/16).toFixed(1), 'b', (b.x/16).toFixed(1), (b.y/16).toFixed(1), b.state, 'tx', (tx/16).toFixed(1));
      if (g.cleared || (b && b.dead)) break;
    }
    total++; hits += g.boss.maxHp - g.boss.hp;
    if (g.boss.dead) wins++;
    console.log(`${st.id} trial${trial}: ${g.boss.dead ? 'WIN' : 'lose'} t=${(f / 60).toFixed(0)}s bossHp=${g.boss.hp}/${g.boss.maxHp} misses=${misses} ${hurts.slice(0,8).join(' ')}`);
  }
}
