import { STAGES, buildStage } from '../js/stages.js';
import { Game } from '../js/game.js';
import { T } from '../js/consts.js';
import { loadData, noInput } from './testlib.mjs';
const data = loadData();
const st = buildStage(STAGES.find((s) => s.id === process.argv[2] || 'tutorial'));
const events = [];
const g = new Game({ stage: st, data, loadout: ['soccer', 'marble', 'pingpong', 'bowling'], onEvent: (t) => events.push(t) });
const p = g.player;
// サッカーで右へ跳ねながら進み、x=50 タイルでビー玉に変身
let phase = 0, f = 0, log = [];
for (f = 0; f < 60 * 40; f++) {
  const tx = p.x / 16;
  const inp = { ...noInput(), right: true, bounce: true };
  if (phase === 0 && tx > 52) { inp.taps = ['marble']; phase = 1; }
  if (phase === 1 && p.launchT > 0) { inp.taps = ['bowling']; phase = 2; log.push(`launched at f${f} x=${tx.toFixed(1)}`); }
  if (phase === 2 && p.ball === 'bowling') { phase = 3; log.push(`bowling at x=${tx.toFixed(1)} vx=${p.vx.toFixed(0)}`); }
  if (phase === 3 && g.level.tile(111, 15) === T.EMPTY) { phase = 4; log.push(`wall broken f${f}`); }
  if (phase === 4 && tx > 118) { inp.taps = ['soccer']; phase = 5; }
  if (phase === 5 && tx > 133) { inp.taps = ['pingpong']; phase = 6; log.push('pingpong at ' + tx.toFixed(1)); }
  if (phase === 6 && tx > 150) { inp.taps = ['soccer']; phase = 7; log.push('over tall wall'); }
  g.update(1 / 60, inp);
  if (f % 60 === 0) log.push(`t${f / 60}s x=${tx.toFixed(1)} y=${(p.y / 16).toFixed(1)} ${p.ball} ${p.state} hp=${p.hp}`);
  if (g.cleared) { log.push('CLEARED at ' + (f / 60).toFixed(1) + 's'); break; }
}
console.log(log.join('\n'));
console.log('events', [...new Set(events)].join(','));
