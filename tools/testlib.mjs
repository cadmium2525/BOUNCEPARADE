import { readFileSync } from 'node:fs';
import { buildBallDefs } from '../js/balls.js';
const root = new URL('..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
export function loadData() {
  return {
    balls: buildBallDefs(J('assets/atlas/balls_atlas.json')),
    rules: J('assets/data/game_rules.json'),
    enemyRules: J('assets/data/enemies.json'),
    bossRules: J('assets/data/bosses.json'),
  };
}
export const noInput = () => ({ left: false, right: false, down: false, bounce: false, bouncePressed: false, taps: [] });
