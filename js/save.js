import { STARTING_BALLS } from './balls.js';

const KEY = 'bounceparade_save_v1';

export function defaultSave() {
  return { cleared: {}, owned: [...STARTING_BALLS], loadout: [...STARTING_BALLS], settings: { bgm: 0.7, se: 0.9 }, seen: {}, collected: {} };
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.owned) return { ...defaultSave(), ...s, settings: { ...defaultSave().settings, ...(s.settings || {}) } };
  } catch { /* 保存できない環境でも遊べる */ }
  return defaultSave();
}

// 集めた物の数（ハートのうつわ・メダル）と、そこから決まる最大ライフ・装備枠
export const MEDALS_PER_STAGE = 3;
// id の形：'factory:medal2' / 'factory:heart' / 'factory:ball'
export function countCollected(s, kind) { const re = new RegExp(`:${kind}\\d*$`); return Object.keys(s.collected || {}).filter((k) => re.test(k)).length; }
export function heartBonus(s) { return countCollected(s, 'heart'); }
export function medalCount(s) { return countCollected(s, 'medal'); }
export function maxSlots(s, totalMedals) { return 6 + (totalMedals > 0 && medalCount(s) >= totalMedals ? 1 : 0); }

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}
