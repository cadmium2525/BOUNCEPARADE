// 隠しルートのテスト：鍵のボールなら取れる／他のボールでは取れない
import { STAGES, buildStage, MEDALS_PER_STAGE } from '../js/stages.js';
import { Game } from '../js/game.js';
import { TILE, T } from '../js/consts.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`); if (!cond) fails++; };

// 1) 配置：各ステージにメダル3枚・隠しボール1個（＋ハート）。固体の中に埋まっていない
for (const st0 of STAGES) {
  const st = buildStage(st0);
  const g = new Game({ stage: st, data, loadout: ['soccer'] });
  const picks = g.entities.filter((e) => e.type === 'pickup');
  const medals = picks.filter((e) => e.kind === 'medal').length;
  const balls = picks.filter((e) => e.kind === 'ball').length, hearts = picks.filter((e) => e.kind === 'heart').length;
  const buried = picks.filter((e) => g.level.solidAt(Math.floor(e.x / TILE), Math.floor(e.y / TILE)));
  ok(medals === MEDALS_PER_STAGE && balls === 1 && hearts === (st.secret.heart ? 1 : 0) && !buried.length,
    `${st.id}: メダル${medals} ボール${balls} ハート${hearts}${buried.length ? ' 埋まっている:' + buried.map((e) => e.id) : ''}`);
}

// 2) 決めた入力で動かして、id を取れたか
function run(id, ball, x, y, secs, policy, want, opts = {}) {
  const st = buildStage(STAGES.find((s) => s.id === id));
  const collected = {};
  const g = new Game({ stage: st, data, loadout: [ball, 'soccer'], collected, owned: [ball] });
  const p = g.player;
  p.setBall(ball); p.x = p.px = x * TILE + 8; p.y = p.py = y * TILE + 8; p.vx = 0; p.vy = 0;
  if (opts.god || opts.tough) p.maxHp = p.hp = 99;
  for (let f = 0; f < secs * 60; f++) {
    if (opts.god) p.invuln = Math.max(p.invuln, 0.05);
    g.update(1 / 60, { ...noInput(), ...policy(g, p, f) });
    if (collected[want]) return { got: true, t: f / 60, g };
  }
  return { got: false, g, p };
}
const expect = (label, r, should) => ok(r.got === should, `${label}: ${r.got ? '取れた' : '取れない'}${r.got ? ` (${r.t.toFixed(1)}s)` : ''}（期待：${should ? '取れる' : '取れない'}）`);

// はじまりの丘：シャボン玉で雲の島へ
expect('丘 シャボン玉', run('tutorial', 'bubble', 146, 3, 20, (g, p) => ({ right: p.x < 171 * 16, left: p.x > 173 * 16, bounce: p.x < 169 * 16 && p.y > 0 }), 'tutorial:ball'), true);
expect('丘 ピンポン玉（高い壁の上から）', run('tutorial', 'pingpong', 146, 3, 15, (g, p) => ({ right: true, bounce: true }), 'tutorial:ball'), false);
expect('丘 ピンポン玉（地面から）', run('tutorial', 'pingpong', 168, 16, 10, (g, p) => ({ right: p.x < 172 * 16, left: p.x > 173 * 16, bounce: true }), 'tutorial:ball'), false);
// 工場：バネ → 磁石でレール
expect('工場 磁石', run('factory', 'magnet', 21, 15, 25, (g, p) => ({ right: p.y < 6 * 16 || p.x < 24 * 16, bounce: true }), 'factory:heart', { god: true }), true);
expect('工場 シャボン玉（トゲの上を漂う：報告のグリッチ）', run('factory', 'bubble', 40, 4, 25, () => ({ right: true, bounce: true }), 'factory:heart', { tough: true }), false);
expect('工場 シャボン玉（バネから）', run('factory', 'bubble', 21, 15, 25, (g, p) => ({ right: true, bounce: true }), 'factory:heart', { god: true }), false);
expect('工場 ピンポン玉', run('factory', 'pingpong', 21, 15, 25, (g, p) => ({ right: true, bounce: true }), 'factory:heart', { god: true }), false);
// 天空：スライムで煙突
expect('天空 スライム', run('sky', 'slime', 180, 16, 30, (g, p, f) => ({ left: p.stuck && p.stuck.ny < -0.5, right: !p.stuck && p.y < 5 * 16, bouncePressed: f % 20 === 0, bounce: f % 20 < 2 }), 'sky:ball'), true);
expect('天空 シャボン玉（下向きの風）', run('sky', 'bubble', 180, 16, 20, () => ({ bounce: true }), 'sky:ball'), false);
expect('天空 ピンポン玉', run('sky', 'pingpong', 180, 16, 15, (g, p) => ({ right: p.y < 5 * 16, bounce: true }), 'sky:ball'), false);
// 火山・氷雪城：火の玉で溶かす
expect('火山 火の玉', run('volcano', 'fire', 137, 19, 15, () => ({ right: true, bounce: false }), 'volcano:ball'), true);
expect('火山 サッカー', run('volcano', 'soccer', 137, 19, 10, () => ({ right: true }), 'volcano:ball'), false);
expect('氷雪城 火の玉', run('ice', 'fire', 147, 19, 15, () => ({ right: true }), 'ice:ball'), true);
expect('氷雪城 サッカー', run('ice', 'soccer', 147, 19, 10, () => ({ right: true }), 'ice:ball'), false);
// 遊園地：上からボウリング球で屋根を割る
expect('遊園地 ボウリング（上から落ちる）', run('amusement', 'bowling', 172, 9, 10, () => ({}), 'amusement:ball'), true);
expect('遊園地 サッカー（屋根の上で跳ねる）', run('amusement', 'soccer', 172, 9, 10, () => ({ bounce: true }), 'amusement:ball'), false);
// 鉱山：重量スイッチ → 扉 → 中へ
{
  const r = run('mine', 'bowling', 174, 14, 3, () => ({}), 'none');
  ok(r.g.level.tile(180, 18) === T.EMPTY, '鉱山 ボウリングで重量スイッチ → 扉がひらく');
  const r2 = run('mine', 'soccer', 174, 14, 3, () => ({}), 'none');
  ok(r2.g.level.tile(180, 18) === T.DOOR, '鉱山 サッカーでは扉はひらかない');
}
expect('鉱山 扉が開いたあと中へ', run('mine', 'bowling', 174, 14, 8, (g, p, f) => (f === 60 ? { taps: ['soccer'] } : { right: f > 60 && p.x < 185 * 16 }), 'mine:ball'), true);
// パレードタワー：ボウリングで屋根 → 火の玉で氷の壁
expect('最終 ボウリング→火の玉', run('final', 'bowling', 364, 9, 12, (g, p, f) => (p.y > 17 * 16 && p.ball === 'bowling' ? { taps: ['fire'] } : { right: p.ball === 'fire' }), 'final:ball'), true);
expect('最終 ボウリングだけ', run('final', 'bowling', 364, 9, 8, (g, p) => ({ right: true }), 'final:ball'), false);
console.log(fails ? `${fails} 件の失敗` : 'すべて OK');
process.exit(fails ? 1 : 0);
