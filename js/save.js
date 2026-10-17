import { STARTING_BALLS } from './balls.js';

const KEY = 'bounceparade_save_v1';

export function defaultSave() {
  return { cleared: {}, owned: [...STARTING_BALLS], loadout: [...STARTING_BALLS], settings: { bgm: 0.7, se: 0.9 }, seen: {} };
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.owned) return { ...defaultSave(), ...s, settings: { ...defaultSave().settings, ...(s.settings || {}) } };
  } catch { /* 保存できない環境でも遊べる */ }
  return defaultSave();
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}
