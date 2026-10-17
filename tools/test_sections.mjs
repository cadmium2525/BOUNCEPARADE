// 各ステージの要所（強制区間・発射装置）を、決めた入力で通り抜けられるか確認する
import { STAGES, buildStage } from '../js/stages.js';
import { Game } from '../js/game.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
function run(id, tx, ty, ball, secs, policy, goal) {
  const st = buildStage(STAGES.find((s) => s.id === id));
  const g = new Game({ stage: st, data, loadout: ['soccer', 'marble', 'pingpong'] });
  const p = g.player;
  p.x = p.px = tx * 16 + 8; p.y = p.py = ty * 16; p.setBall(ball);
  let hurts = 0; g.opts.onEvent = (t) => { if (t === 'hurt' || t === 'miss') hurts++; };
  let ok = false, f;
  for (f = 0; f < secs * 60; f++) {
    const inp = { ...noInput(), ...policy(g, p, f) };
    g.update(1 / 60, inp);
    if (goal(g, p)) { ok = true; break; }
  }
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${id}: ${(f / 60).toFixed(1)}s pos=(${(p.x / 16).toFixed(1)},${(p.y / 16).toFixed(1)}) ball=${p.ball} hp=${p.hp} hurts=${hurts}`);
}
// 工場：階段→縦穴（ボウリング強制）→床を2枚ぬく→通路
run('factory', 84, 16, 'soccer', 20, (g, p) => ({ right: true, bounce: true, taps: p.ball === 'bowling' && !p.forced && p.y > 18 * 16 ? ['soccer'] : [] }), (g, p) => p.x > 101 * 16);
// 工場：ビー玉で穴 → 発射装置×2 → 高台へ
run('factory', 114, 19, 'soccer', 15, (g, p, f) => ({ right: p.y > 10 * 16 || p.x < 128 * 16 + 4, taps: f === 20 ? ['marble'] : p.y < 6 * 16 && p.ball === 'marble' ? ['soccer'] : [] }), (g, p) => p.x > 129 * 16 && p.y < 7 * 16);
// 天空：シャボン玉の谷
run('sky', 84, 7, 'soccer', 20, (g, p) => ({ right: true, bounce: p.forced ? p.y > 9 * 16 : true }), (g, p) => p.x > 111 * 16 && p.y < 14 * 16 && p.grounded);
// 天空：送風機で高い島へ
run('sky', 26, 17, 'soccer', 12, (g, p) => ({ right: p.x < 30 * 16 + 8 || p.y < 6 * 16, bounce: true }), (g, p) => p.x > 34 * 16 && p.y < 6 * 16);
// 火山：熱風で溶岩を渡る
run('volcano', 45, 19, 'soccer', 15, (g, p) => ({ right: true, bounce: true }), (g, p) => p.x > 67 * 16 && p.grounded);
// 火山：火の玉の区間
run('volcano', 80, 19, 'soccer', 20, (g, p) => ({ right: true, bounce: true }), (g, p) => p.x > 114 * 16);
// 遊園地：ラグビー区間
run('amusement', 78, 19, 'soccer', 25, (g, p) => ({ right: true, bounce: true }), (g, p) => p.x > 112 * 16);
// 鉱山：ビー玉トンネル → 段差で止まる
run('mine', 44, 19, 'soccer', 10, (g, p, f) => ({ right: true, taps: f === 30 ? ['marble'] : [] }), (g, p) => p.x > 85 * 16);
// 鉱山：磁気レール
run('mine', 94, 19, 'soccer', 20, (g, p) => ({ right: true, bounce: p.x < 125 * 16 }), (g, p) => p.x > 127 * 16 && p.grounded);
// 氷：ビー玉で氷をすべってトンネル → スライムの縦穴
run('ice', 50, 19, 'soccer', 30, (g, p, f) => ({ right: !p.stuck || p.stuck.nx > 0 ? true : false, left: p.stuck && p.stuck.nx < 0, bounce: p.ball === 'slime' ? f % 20 < 2 : false, bouncePressed: p.ball === 'slime' && f % 20 === 0, taps: f === 30 ? ['marble'] : [] }), (g, p) => p.y < 6 * 16 && p.x > 93 * 16);
// 最終：象徴コンボ
run('final', 40, 16, 'soccer', 20, (g, p, f) => ({ right: true, bounce: true, taps: f === 20 ? ['marble'] : p.launchT > 0 ? ['bowling'] : p.x > 106 * 16 && p.ball === 'bowling' ? ['soccer'] : [] }), (g, p) => p.x > 107 * 16);
