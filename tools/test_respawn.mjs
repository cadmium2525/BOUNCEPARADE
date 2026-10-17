// 復帰位置のテスト：穴に落ちた後・ミスの後に、必ず床の上に戻るか
import { STAGES, buildStage } from '../js/stages.js';
import { Game } from '../js/game.js';
import { TILE } from '../js/consts.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
let fails = 0;
const settle = (g, n = 90) => { for (let i = 0; i < n; i++) g.update(1 / 60, noInput()); };
for (const st0 of STAGES) {
  const st = buildStage(st0);
  // 1) スタートと各チェックポイントからの再開
  const g0 = new Game({ stage: st, data, loadout: ['soccer'] });
  const cps = g0.entities.filter((e) => e.type === 'checkpoint');
  for (const cp of [null, ...cps]) {
    const g = new Game({ stage: st, data, loadout: ['soccer'] });
    if (cp) { g.checkpoint = { key: cp.key, x: cp.x, y: cp.y + 12, ball: 'soccer' }; g.build(); }
    let pits = 0; g.onPit = () => { pits++; };
    settle(g, 120);
    const ok = pits === 0 && g.player.y < g.level.ph;
    if (!ok) { fails++; console.log(`FAIL ${st.id} 再開 ${cp ? 'CP@' + Math.floor(cp.x / TILE) : 'start'} pits=${pits}`); }
  }
  // 2) 動く床・一時的な足場の上に立った後で穴に落ちる
  const g = new Game({ stage: st, data, loadout: ['soccer', 'marble'] });
  const plats = g.entities.filter((e) => e.type === 'platform');
  for (const pl of plats) {
    const p = g.player;
    p.setBall('marble'); p.x = pl.x; p.y = pl.top - p.def.r - 1; p.vx = 0; p.vy = 0;
    for (let i = 0; i < 30; i++) g.update(1 / 60, noInput());
    p.hp = 3; p.y = g.level.ph + 100; g.update(1 / 60, noInput()); // 穴へ
    let pits = 0; const op = g.onPit.bind(g); g.onPit = (pp) => { pits++; op(pp); };
    settle(g, 120);
    const ok = pits === 0 && !p.dead;
    if (!ok) { fails++; console.log(`FAIL ${st.id} 動く床@${Math.floor(pl.ox / TILE)} の後の復帰で再び落下 pits=${pits}`); }
    g.onPit = op;
  }
  // 3) 重量壁・溶ける氷塊・扉の上で記録されないこと
  const level = g.level;
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) {
    const t = level.tile(x, y);
    if ([8, 9, 10].includes(t) && !level.solidAt(x, y - 1)) {
      if (g.isSafeSpot(x * TILE + 8, y * TILE - 21, 20)) { fails++; console.log(`FAIL ${st.id} 壊れる床(${x},${y})が安全地点扱い`); }
    }
  }
  console.log(`${st.id}: checkpoints=${cps.length} platforms=${plats.length}`);
}
console.log(fails ? `${fails} 件の失敗` : 'すべて OK');
process.exit(fails ? 1 : 0);
