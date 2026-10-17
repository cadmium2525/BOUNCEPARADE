// BOUNCE PARADE の BGM・効果音を「かなでる」の JSON 形式で書き出す。
//   node tools/sound/gen.mjs   → audio/src/bgm/*.json, audio/src/se/*.json
// 書き出した JSON は「かなでる」の「JSON を貼り付け」でそのまま開ける。
import { writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
mkdirSync(root + 'audio/src/bgm', { recursive: true });
mkdirSync(root + 'audio/src/se', { recursive: true });

// ===== 音楽ヘルパー =====
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], dim: [0, 3, 6], sus4: [0, 5, 7] };
function parseChord(sym) {
  const m = sym.match(/^([A-G][#b]?)(.*)$/);
  return { root: NOTE[m[1]], q: QUAL[m[2]] ?? QUAL[''], name: m[1] };
}
const midi = (pc, oct) => 12 * (oct + 1) + pc;
// "E5/1 G5/.5 -/1" → [[開始拍, 音, 長さ, 強さ]]
function mel(str, vel = 0.8, start = 0) {
  let t = start; const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [n, d] = tok.split('/'); const dur = Number(d);
    if (n !== '-') out.push([t, n, dur * 0.95, vel * (Math.abs(t % 1) < 1e-6 ? 1 : 0.88)]);
    t += dur;
  }
  return { notes: out, len: t };
}
function check(name, m, bars) { if (Math.abs(m.len - bars * 4) > 1e-6) throw new Error(`${name}: メロディの長さ ${m.len} ≠ ${bars * 4}`); }
// 和音：小節ごとにパッド（全音符）
function padNotes(prog, oct = 3, vel = 0.5) { return prog.map((c, i) => [i * 4, `${c}:${oct}`, 4, vel]); }
// ベース：パターン（拍,オクターブ差,長さ）を各小節のルートで
function bassNotes(prog, pat, oct = 2, vel = 0.85) {
  const out = [];
  prog.forEach((c, i) => { const { root, q } = parseChord(c); for (const [b, k, d, v = 1] of pat) out.push([i * 4 + b, midi(root, oct) + (k === 5 ? q[2] : k === 8 ? 12 : k), d, vel * v]); });
  return out;
}
// アルペジオ：16 分 or 8 分で和音の構成音を上下
function arpNotes(prog, step = 0.5, oct = 4, vel = 0.5, shape = [0, 1, 2, 3, 2, 1, 0, 1]) {
  const out = [];
  prog.forEach((c, i) => {
    const { root, q } = parseChord(c);
    const tones = [...q.slice(0, 3).map((x) => midi(root, oct) + x), midi(root, oct) + 12];
    for (let k = 0; k < 4 / step; k++) out.push([i * 4 + k * step, tones[shape[k % shape.length] % tones.length], step * 0.9, vel * (k % 2 ? 0.8 : 1)]);
  });
  return out;
}
// 2 周目はオクターブ上・別の音色で重ねる
const shift = (notes, beats, semis = 0, velK = 1) => notes.map(([t, n, d, v]) => [t + beats, typeof n === 'number' ? n + semis : transposeName(n, semis), d, v * velK]);
function transposeName(n, s) {
  if (!s) return n;
  const m = n.match(/^([A-G][#b]?)(-?\d)$/); if (!m) return n;
  return midi(NOTE[m[1]], Number(m[2])) + s;
}

// ===== 曲の組み立て =====
// 1 周 = bars 小節。ループ用に 3 周ぶん並べ、後で 2 周目をループ区間として切り出す。
function song(name, bpm, bars, key, tracks, opts = {}) {
  const L = bars * 4;
  const passes = opts.loop === false ? 1 : 3;
  const out = tracks.map((t) => ({ ...t, clips: [] }));
  tracks.forEach((t, i) => {
    for (let p = 0; p < passes; p++) {
      if (t.notes?.length) out[i].clips.push({ at: p * L, notes: t.notes, len: L });
      if (t.grid) for (const [at, g, len] of t.grid) out[i].clips.push({ at: p * L + at, len, grid: g });
    }
    delete out[i].notes; delete out[i].grid;
  });
  return {
    name: `BOUNCE PARADE - ${name}`, bpm, sig: [4, 4], bars: passes * bars + (opts.loop === false ? 1 : 0), key,
    sends: { reverb: { size: 1.1, decay: 1.8, damp: 7000, predelay: 0.02 }, delay: { time: '1/8d', feedback: 0.28, tone: 4500 } },
    master: { loudness: opts.loudness ?? -16, ceiling: -1 },
    tracks: out,
    _loop: opts.loop === false ? null : { bars, bpm },
  };
}
const drums = (kit, pattern, bars, fill, vol = -2) => {
  const grid = [];
  for (let b = 0; b < bars; b++) grid.push([b * 4, b === bars - 1 && fill ? fill : pattern, 4]);
  return { id: 'drums', name: 'ドラム', type: 'drums', kit, volume: vol, grid, humanize: { time: 0.004, vel: 0.06 } };
};

const BGM = {};

// タイトル：明るく弾む C メジャー
{
  const prog = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'];
  const m = mel('E5/.5 G5/.5 C6/1 B5/.5 G5/.5 E5/1 D5/.5 G5/.5 B5/1 A5/.5 G5/.5 D5/1 C5/.5 E5/.5 A5/1 G5/.5 E5/.5 C5/1 F5/1 E5/.5 F5/.5 A5/2 G5/.5 G5/.5 E5/.5 G5/.5 C6/1 G5/1 B5/.5 A5/.5 G5/.5 B5/.5 D6/2 C6/1 A5/.5 F5/.5 A5/1 C6/1 B5/1.5 A5/.5 G5/1 -/1');
  check('title', m, 8);
  const p16 = [...prog, ...prog];
  BGM.title = song('タイトル', 140, 16, 'C major', [
    { id: 'lead', name: 'メロディ', inst: 'squarelead', volume: -1, sends: { reverb: 0.15, delay: 0.12 }, notes: [...m.notes, ...shift(m.notes, 32, 0)] },
    { id: 'lead2', name: 'メロディ（2周目）', inst: 'bellkeys', volume: -6, sends: { reverb: 0.25 }, notes: shift(m.notes, 32, 12, 0.8) },
    { id: 'arp', name: 'アルペジオ', inst: 'pluck', volume: -8, pan: 0.3, sends: { delay: 0.2 }, notes: arpNotes(p16, 0.5, 4, 0.5) },
    { id: 'pad', name: 'パッド', inst: 'pad', volume: -10, sends: { reverb: 0.3 }, notes: padNotes(p16) },
    { id: 'bass', name: 'ベース', inst: 'synthbass', volume: -2, notes: bassNotes(p16, [[0, 0, 0.45], [1, 0, 0.45], [1.5, 8, 0.4, 0.7], [2, 0, 0.45], [3, 5, 0.45, 0.8], [3.5, 8, 0.4, 0.7]]) },
    drums('house', { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' }, 16, { kick: 'x...x...x...x.x.', snare: '....x...x.xxxxXX', hat: '..x...x.........' }),
  ]);
}

// ステージ選択：ゆったり F メジャー
{
  const prog = ['FM7', 'Em7', 'Dm7', 'C', 'Bb', 'Am7', 'Gm7', 'C7'];
  const m = mel('A5/1.5 G5/.5 F5/1 C5/1 G5/1.5 F5/.5 E5/2 F5/1 A5/1 C6/1 A5/1 G5/3 -/1 D5/1 F5/1 Bb5/1.5 A5/.5 A5/1 G5/1 E5/2 F5/1 G5/1 A5/1 Bb5/1 C6/3 -/1', 0.7);
  check('select', m, 8);
  BGM.select = song('ステージ選択', 108, 8, 'F major', [
    { id: 'lead', name: 'メロディ', inst: 'softlead', volume: -3, sends: { reverb: 0.3, delay: 0.15 }, notes: m.notes },
    { id: 'keys', name: 'エレピ', inst: 'epiano', volume: -6, sends: { reverb: 0.2 }, notes: prog.flatMap((c, i) => [[i * 4, `${c}:3`, 1.5, 0.5], [i * 4 + 1.5, `${c}:3`, 2.5, 0.42]]) },
    { id: 'bell', name: 'グロッケン', inst: 'glock', volume: -14, pan: -0.3, sends: { delay: 0.3 }, notes: arpNotes(prog, 1, 5, 0.4, [0, 2, 1, 3]) },
    { id: 'bass', name: 'ベース', inst: 'ebass', volume: -3, notes: bassNotes(prog, [[0, 0, 1.4], [1.5, 0, 0.5, 0.7], [2, 5, 1.8, 0.8]]) },
    drums('lofi', { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo' }, 8, null, -4),
  ]);
}

// はじまりの丘：G メジャー、ピコピコ
{
  const prog = ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'D7'];
  const m = mel('D5/.5 G5/.5 B5/.5 G5/.5 D6/1 B5/1 C6/.5 B5/.5 A5/.5 G5/.5 E5/2 F#5/.5 A5/.5 D6/.5 A5/.5 C6/1 B5/.5 A5/.5 G5/2 -/1 D5/1 E5/.5 G5/.5 B5/1 A5/.5 G5/.5 E5/1 C5/.5 E5/.5 G5/1 C6/1 B5/1 A5/.5 B5/.5 C6/.5 D6/.5 F#5/1 A5/1 G5/3 -/1');
  check('grass', m, 8);
  const p16 = [...prog, ...prog];
  BGM.grass = song('はじまりの丘', 150, 16, 'G major', [
    { id: 'lead', name: 'メロディ', inst: 'chip', volume: 2, sends: { reverb: 0.1, delay: 0.1 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'lead2', name: '2周目のハモり', inst: 'squarelead', volume: -8, pan: -0.25, notes: shift(m.notes, 32, -12, 0.7) },
    { id: 'arp', name: 'アルペジオ', inst: 'chip', volume: -9, pan: 0.35, notes: arpNotes(p16, 0.25, 4, 0.45, [0, 1, 2, 3, 2, 1, 0, 2]) },
    { id: 'bass', name: 'ベース', inst: 'pluckbass', volume: -1, notes: bassNotes(p16, [[0, 0, 0.45], [0.5, 8, 0.4, 0.6], [1, 5, 0.45], [1.5, 8, 0.4, 0.6], [2, 0, 0.45], [2.5, 8, 0.4, 0.6], [3, 5, 0.45], [3.5, 8, 0.4, 0.6]]) },
    drums('acoustic', { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, 16, { kick: 'x.......x.......', snare: '....x...x.x.xxxx', hat: 'x.x.x.x.........' }),
  ]);
}

// 工場：D マイナー、機械的
{
  const prog = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'];
  const m = mel('D5/.75 D5/.75 F5/.5 A5/1 G5/1 F5/.5 E5/.5 D5/1 A4/2 Bb4/.75 D5/.75 F5/.5 Bb5/2 C6/.75 Bb5/.75 A5/.5 G5/2 D5/.75 D5/.75 F5/.5 A5/1 C6/1 D6/1 C6/.5 A5/.5 F5/2 G5/.75 Bb5/.75 D6/.5 C6/1 Bb5/1 A5/2 C#6/2');
  check('factory', m, 8);
  const p16 = [...prog, ...prog];
  BGM.factory = song('工場', 150, 16, 'D minor', [
    { id: 'lead', name: 'メロディ', inst: 'sawlead', volume: -1, sends: { reverb: 0.12, delay: 0.1 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'stab', name: 'スタブ', inst: 'chordstab', volume: -8, notes: p16.flatMap((c, i) => [[i * 4 + 0.5, `${c}:4`, 0.25, 0.5], [i * 4 + 1.5, `${c}:4`, 0.25, 0.45], [i * 4 + 2.75, `${c}:4`, 0.25, 0.5]]) },
    { id: 'metal', name: 'メタル', inst: 'marimba', volume: -10, pan: 0.4, notes: arpNotes(p16, 0.25, 5, 0.35, [0, 0, 2, 0, 1, 0, 3, 0]) },
    { id: 'bass', name: 'ベース', inst: 'synthbass', volume: -1, notes: bassNotes(p16, [[0, 0, 0.2], [0.25, 0, 0.2, 0.6], [0.5, 8, 0.2], [0.75, 0, 0.2, 0.6], [1, 0, 0.2], [1.25, 0, 0.2, 0.6], [1.5, 8, 0.2], [1.75, 0, 0.2, 0.6], [2, 0, 0.2], [2.25, 0, 0.2, 0.6], [2.5, 8, 0.2], [2.75, 0, 0.2, 0.6], [3, 5, 0.2], [3.25, 0, 0.2, 0.6], [3.5, 8, 0.2], [3.75, 0, 0.2, 0.6]]) },
    drums('808', { kick: 'x..x..x...x..x..', snare: '....x.......x...', clap: '............x...', hat: 'xxxxxxxxxxxxxxxx', perc: '..x.......x.....' }, 16, { kick: 'x..x..x...x.x.x.', snare: '....x.......xxxx', hat: 'xxxxxxxxxxxx....' }),
  ]);
}

// 天空都市：A メジャー、空気感
{
  const prog = ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'E'];
  const m = mel('E5/1 A5/1 C#6/1.5 B5/.5 B5/2 G#5/2 A5/1 F#5/1 C#6/1 A5/1 F#5/3 -/1 E5/1 A5/1 E6/1.5 D6/.5 C#6/1 B5/1 G#5/2 F#5/1 A5/1 D6/1 C#6/1 B5/3 -/1', 0.75);
  check('sky', m, 8);
  const p16 = [...prog, ...prog];
  BGM.sky = song('天空都市', 140, 16, 'A major', [
    { id: 'lead', name: 'メロディ', inst: 'flute', volume: 0, sends: { reverb: 0.35, delay: 0.2 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'bell', name: 'ベル', inst: 'glock', volume: -9, pan: 0.3, sends: { delay: 0.3 }, notes: arpNotes(p16, 0.5, 5, 0.4, [0, 2, 3, 1]) },
    { id: 'pad', name: 'パッド', inst: 'airpad', volume: -6, sends: { reverb: 0.4 }, notes: padNotes(p16, 4, 0.45) },
    { id: 'harp', name: 'ハープ', inst: 'harp', volume: -6, pan: -0.3, notes: arpNotes(p16, 0.25, 3, 0.45, [0, 1, 2, 3, 1, 2, 3, 2]) },
    { id: 'bass', name: 'ベース', inst: 'subbass', volume: -3, notes: bassNotes(p16, [[0, 0, 1.5], [1.5, 0, 0.5, 0.7], [2, 5, 1.5, 0.8], [3.5, 8, 0.5, 0.6]]) },
    drums('house', { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', shaker: 'xxxxxxxxxxxxxxxx' }, 16, null, -4),
  ]);
}

// 火山：E マイナー、激しく
{
  const prog = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'];
  const m = mel('E5/.5 E5/.5 G5/.5 B5/.5 E6/1 D6/1 C6/1 B5/.5 A5/.5 G5/2 A5/.5 F#5/.5 D5/.5 F#5/.5 A5/1 D6/1 D#6/2 B5/2 E6/.5 D6/.5 B5/.5 G5/.5 E5/1 G5/1 C6/1 E6/1 G5/2 A5/1 C6/1 E6/1 A5/1 B5/2 D#6/2');
  check('volcano', m, 8);
  const p16 = [...prog, ...prog];
  BGM.volcano = song('火山', 160, 16, 'E minor', [
    { id: 'lead', name: 'ブラス', inst: 'brass', volume: 1, sends: { reverb: 0.2 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'lead2', name: 'リード', inst: 'sawlead', volume: -6, notes: shift(m.notes, 32, 12, 0.7) },
    { id: 'gtr', name: 'ギター', inst: { preset: 'sawlead', amp: { r: 0.05 } }, volume: -9, fx: [{ type: 'dist', drive: 14, kind: 'tape', mix: 0.8 }], notes: p16.flatMap((c, i) => { const { root } = parseChord(c); return [0, 0.5, 1.5, 2, 2.5, 3.5].map((b) => [i * 4 + b, [midi(root, 3), midi(root, 3) + 7], 0.35, 0.7]); }) },
    { id: 'bass', name: 'ベース', inst: 'reese', volume: -1, notes: bassNotes(p16, [[0, 0, 0.4], [0.5, 0, 0.4], [1, 0, 0.4], [1.5, 8, 0.4], [2, 0, 0.4], [2.5, 0, 0.4], [3, 5, 0.4], [3.5, 8, 0.4]]) },
    { id: 'pad', name: 'クワイア', inst: 'choir', volume: -12, sends: { reverb: 0.4 }, notes: padNotes(p16, 3, 0.4) },
    drums('acoustic', { kick: 'x.x...x.x.x...x.', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' }, 16, { kick: 'x.x...x.x.x.x.x.', snare: '....X...x.xxXXXX', hat: 'x.x.x.x.........' }),
  ]);
}

// 遊園地：C メジャー、サーカス風
{
  const prog = ['C', 'Am', 'Dm', 'G', 'C', 'A7', 'Dm', 'G7'];
  const m = mel('G5/.5 F#5/.5 G5/.5 E5/.5 C5/1 E5/1 A5/.5 G#5/.5 A5/.5 F5/.5 C5/1 A5/1 D5/.5 F5/.5 A5/.5 D6/.5 C6/1 A5/1 B5/1 G5/1 D5/2 G5/.5 F#5/.5 G5/.5 C6/.5 E6/1 C6/1 C#6/.5 D6/.5 E6/.5 G6/.5 F6/1 E6/1 D6/.5 C6/.5 B5/.5 A5/.5 G5/1 F5/1 E5/1 G5/1 C6/2');
  check('amusement', m, 8);
  const p16 = [...prog, ...prog];
  BGM.amusement = song('遊園地', 150, 16, 'C major', [
    { id: 'lead', name: 'オルガン', inst: 'organ', volume: -2, sends: { reverb: 0.2 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'box', name: 'オルゴール', inst: 'musicbox', volume: -6, pan: 0.3, notes: shift(m.notes, 32, 12, 0.8) },
    { id: 'oompa', name: '伴奏', inst: 'pizz', volume: -3, notes: p16.flatMap((c, i) => [[i * 4 + 1, `${c}:4`, 0.4, 0.5], [i * 4 + 3, `${c}:4`, 0.4, 0.5]]) },
    { id: 'bass', name: 'チューバ', inst: 'fmbass', volume: -2, notes: bassNotes(p16, [[0, 0, 0.8], [2, 5, 0.8]]) },
    drums('acoustic', { kick: 'x.......x.......', snare: '....x.......x...', tamb: '..x...x...x...x.' }, 16, { kick: 'x.......x.......', snare: '....x...xxxxxxxx', tamb: '..x...x...x...x.' }, -3),
  ]);
}

// 地下鉱山：A マイナー、低く渋い
{
  const prog = ['Am', 'F', 'G', 'Em', 'Am', 'F', 'E', 'E'];
  const m = mel('A4/1 C5/.5 E5/.5 -/.5 E5/.5 D5/1 C5/1 A4/1 F4/2 G4/1 B4/.5 D5/.5 -/.5 D5/.5 C5/1 B4/1 G4/1 E4/2 A4/.5 C5/.5 E5/.5 A5/.5 G5/1 E5/1 F5/1 E5/.5 D5/.5 C5/2 B4/.5 C5/.5 D5/.5 E5/.5 G#5/1 B5/1 A5/2 G#5/2', 0.75);
  check('mine', m, 8);
  const p16 = [...prog, ...prog];
  BGM.mine = song('地下鉱山', 128, 16, 'A minor', [
    { id: 'lead', name: 'メロディ', inst: 'koto', volume: 1, sends: { reverb: 0.25, delay: 0.2 }, notes: [...m.notes, ...shift(m.notes, 32, 12)] },
    { id: 'pad', name: 'パッド', inst: 'darkpad', volume: -6, sends: { reverb: 0.4 }, notes: padNotes(p16, 3, 0.5) },
    { id: 'drip', name: 'しずく', inst: 'kalimba', volume: -10, pan: -0.4, sends: { delay: 0.4 }, notes: arpNotes(p16, 1, 5, 0.35, [3, 1, 2, 0]) },
    { id: 'bass', name: 'ベース', inst: 'fmbass', volume: -1, notes: bassNotes(p16, [[0, 0, 0.7], [0.75, 0, 0.25, 0.6], [1.5, 8, 0.4, 0.7], [2, 0, 0.7], [3, 5, 0.4], [3.5, 0, 0.4, 0.7]]) },
    drums('lofi', { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.xxx.x.x.xxx.x.', rim: '......x.......x.' }, 16, null, -2),
  ]);
}

// 氷雪城：B マイナー、きらきら
{
  const prog = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#'];
  const m = mel('F#5/1 B5/1 D6/1 C#6/1 B5/2 G5/2 A5/1 F#5/1 D5/1 F#5/1 E5/3 -/1 F#5/1 B5/1 F#6/1 E6/1 D6/1 B5/1 G5/2 G5/1 B5/1 E6/1 D6/1 C#6/2 A#5/2', 0.75);
  check('ice', m, 8);
  const p16 = [...prog, ...prog];
  BGM.ice = song('氷雪城', 132, 16, 'B minor', [
    { id: 'lead', name: 'チェレスタ', inst: 'celesta', volume: 2, sends: { reverb: 0.4, delay: 0.25 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'lead2', name: 'ストリングス', inst: 'strings', volume: -6, sends: { reverb: 0.4 }, notes: shift(m.notes, 32, -12, 0.7) },
    { id: 'arp', name: 'グロッケン', inst: 'glock', volume: -10, pan: 0.35, sends: { delay: 0.3 }, notes: arpNotes(p16, 0.5, 5, 0.35, [0, 1, 2, 3, 2, 1, 2, 3]) },
    { id: 'pad', name: 'ガラスパッド', inst: 'glasspad', volume: -8, sends: { reverb: 0.5 }, notes: padNotes(p16, 3, 0.45) },
    { id: 'bass', name: 'ベース', inst: 'subbass', volume: -3, notes: bassNotes(p16, [[0, 0, 1.5], [1.5, 0, 0.5, 0.7], [2, 5, 2, 0.8]]) },
    drums('house', { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', shaker: 'x.x.x.x.x.x.x.x.' }, 16, null, -5),
  ]);
}

// ボス：C マイナー、緊迫
{
  const prog = ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G'];
  const m = mel('C5/.5 C5/.5 Eb5/.5 G5/.5 C6/1 Bb5/1 Ab5/1 G5/.5 F5/.5 Eb5/2 F5/.5 G5/.5 Ab5/.5 Bb5/.5 D6/1 Bb5/1 B5/2 D6/2 C6/.5 Bb5/.5 G5/.5 Eb5/.5 C5/1 Eb5/1 Ab5/1 C6/1 Eb6/2 F5/.5 Ab5/.5 C6/.5 F6/.5 Eb6/1 D6/1 D6/2 B5/2');
  check('boss', m, 8);
  const p16 = [...prog, ...prog];
  BGM.boss = song('ボス', 170, 16, 'C minor', [
    { id: 'lead', name: 'リード', inst: 'sawlead', volume: 0, sends: { reverb: 0.15, delay: 0.1 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'lead2', name: 'ブラス', inst: 'brass', volume: -5, notes: shift(m.notes, 32, -12, 0.8) },
    { id: 'stab', name: 'スーパーソウ', inst: 'supersaw', volume: -8, notes: p16.flatMap((c, i) => [0, 0.75, 1.5, 2.5, 3].map((b) => [i * 4 + b, `${c}:4`, 0.3, 0.5])) },
    { id: 'bass', name: 'ベース', inst: 'reese', volume: -1, notes: bassNotes(p16, [[0, 0, 0.2], [0.25, 0, 0.2, 0.7], [0.5, 0, 0.2], [0.75, 8, 0.2, 0.7], [1, 0, 0.2], [1.25, 0, 0.2, 0.7], [1.5, 5, 0.2], [1.75, 0, 0.2, 0.7], [2, 0, 0.2], [2.25, 0, 0.2, 0.7], [2.5, 0, 0.2], [2.75, 8, 0.2, 0.7], [3, 0, 0.2], [3.25, 5, 0.2, 0.7], [3.5, 8, 0.2], [3.75, 0, 0.2, 0.7]]) },
    drums('acoustic', { kick: 'x..x..x.x..x..x.', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' }, 16, { kick: 'x..x..x.x.x.x.x.', snare: '....X...xxxxXXXX', hat: 'x.x.x.x.........' }),
  ]);
}

// パレードタワー：G マイナー、壮大
{
  const prog = ['Gm', 'Eb', 'F', 'D', 'Gm', 'Eb', 'Cm', 'D'];
  const m = mel('G5/1 D5/.5 G5/.5 Bb5/1 A5/1 G5/.5 F5/.5 Eb5/1 G5/2 F5/1 C5/.5 F5/.5 A5/1 C6/1 D6/2 F#5/2 G5/1 Bb5/.5 D6/.5 G6/1 F6/1 Eb6/1 D6/.5 C6/.5 Bb5/2 C6/.5 Bb5/.5 A5/.5 G5/.5 Eb6/1 C6/1 D6/3 -/1');
  check('final', m, 8);
  const p16 = [...prog, ...prog];
  BGM.final = song('パレードタワー', 158, 16, 'G minor', [
    { id: 'lead', name: 'ブラス', inst: 'brass', volume: 1, sends: { reverb: 0.25 }, notes: [...m.notes, ...shift(m.notes, 32)] },
    { id: 'lead2', name: 'スーパーソウ', inst: 'supersaw', volume: -6, notes: shift(m.notes, 32, 12, 0.7) },
    { id: 'str', name: 'ストリングス', inst: 'strings', volume: -6, sends: { reverb: 0.35 }, notes: arpNotes(p16, 0.25, 4, 0.45, [0, 1, 2, 3, 2, 1, 2, 3]) },
    { id: 'choir', name: 'クワイア', inst: 'choir', volume: -10, sends: { reverb: 0.4 }, notes: padNotes(p16, 3, 0.45) },
    { id: 'bass', name: 'ベース', inst: 'synthbass', volume: -1, notes: bassNotes(p16, [[0, 0, 0.4], [0.5, 8, 0.4, 0.7], [1, 0, 0.4], [1.5, 8, 0.4, 0.7], [2, 0, 0.4], [2.5, 8, 0.4, 0.7], [3, 5, 0.4], [3.5, 8, 0.4, 0.7]]) },
    drums('cinematic', { kick: 'x.......x.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', tom1: '..............x.' }, 16, { kick: 'x.......x.......', snare: '....X...', tom1: '........x.x.....', tom2: '...........x.x..', tom3: '..............xx' }),
  ]);
}

// クリアのジングル（ループしない）
BGM.clear = song('クリア', 140, 2, 'C major', [
  { id: 'lead', name: 'ファンファーレ', inst: 'brass', volume: 0, sends: { reverb: 0.3 }, notes: [[0, 'G4', 0.3, 0.8], [0.33, 'C5', 0.3, 0.8], [0.66, 'E5', 0.3, 0.8], [1, 'G5', 0.9, 0.9], [2, 'E5', 0.45, 0.8], [2.5, 'G5', 0.45, 0.8], [3, 'C6', 3, 1]] },
  { id: 'chip', name: 'ピコピコ', inst: 'chip', volume: -6, notes: [[0, 'G5', 0.3, 0.7], [0.33, 'C6', 0.3, 0.7], [0.66, 'E6', 0.3, 0.7], [1, 'G6', 0.9, 0.8], [3, 'C7', 2, 0.8]] },
  { id: 'pad', name: 'パッド', inst: 'strings', volume: -6, sends: { reverb: 0.4 }, notes: [[0, 'C:4', 2, 0.6], [2, 'F:4', 1, 0.6], [3, 'C:4', 3, 0.7]] },
  { id: 'bass', name: 'ベース', inst: 'synthbass', volume: -2, notes: [[0, 'C2', 2, 0.8], [2, 'F2', 1, 0.8], [3, 'C2', 3, 0.9]] },
  { id: 'drums', name: 'ドラム', type: 'drums', kit: 'acoustic', volume: -2, grid: [[0, { kick: 'x...x...x...X...', snare: '..........x.x...', crash: '............x...' }, 4]] },
], { loop: false, loudness: -14 });

// ===== 効果音 =====
const SE = {
  bounce: { preset: 'boing', pitch: 2, length: 0.35, tone: 0.2, space: 0.05, punch: 0.4, seed: 1 },
  bounce_light: { preset: 'pop', pitch: 6, length: 0.6, tone: 0.5, space: 0.05, punch: 0.3, seed: 2 },
  bounce_metal: { preset: 'pon', pitch: -2, length: 0.5, tone: 0.3, space: 0.1, punch: 0.4, seed: 3 },
  bounce_rugby: { preset: 'boing', pitch: -4, length: 0.45, tone: -0.2, space: 0.05, punch: 0.5, seed: 4 },
  heavy: { preset: 'boom', pitch: 2, length: 0.4, tone: -0.2, space: 0.1, punch: 0.8, seed: 5 },
  land: { preset: 'footstep', pitch: 0, length: 0.8, tone: 0, space: 0.05, punch: 0.5, seed: 6 },
  item: { preset: 'powerup', pitch: 3, length: 0.6, tone: 0.3, space: 0.2, punch: 0.4, seed: 7 },
  checkpoint: { preset: 'chime', pitch: 0, length: 0.8, tone: 0.3, space: 0.3, punch: 0.4, seed: 8 },
  click: { preset: 'click', pitch: 0, length: 1, tone: 0, space: 0.05, punch: 0.5, seed: 9 },
  launch: { preset: 'whoosh', pitch: 4, length: 0.5, tone: 0.3, space: 0.15, punch: 0.8, seed: 10 },
  spring: { preset: 'jump', pitch: 0, length: 0.8, tone: 0.2, space: 0.1, punch: 0.5, seed: 11 },
  bumper: { preset: 'bell', pitch: 7, length: 0.35, tone: 0.5, space: 0.2, punch: 0.7, seed: 12 },
  switch: { preset: 'toggle', pitch: 0, length: 1, tone: 0.2, space: 0.1, punch: 0.6, seed: 13 },
  door: { preset: 'downer', pitch: -5, length: 0.5, tone: -0.3, space: 0.2, punch: 0.5, seed: 14 },
  stomp: { preset: 'punch', pitch: 5, length: 0.6, tone: 0.3, space: 0.1, punch: 0.7, seed: 15 },
  break: { preset: 'explosion', pitch: 4, length: 0.5, tone: 0.2, space: 0.2, punch: 0.9, seed: 16 },
  melt: { layers: [{ src: 'noise', filter: { type: 'hp', freq: [[0, 2500], [0.5, 6000]] }, amp: { a: 0.01, d: 0.55 }, gain: -6, width: 0.6 }, { src: 'crackle', density: 60, filter: { type: 'hp', freq: 3000 }, amp: { a: 0.01, d: 0.4 }, gain: -10 }], normalize: -3, seed: 17 },
  armor: { preset: 'impact', pitch: 9, length: 0.25, tone: 0.6, space: 0.1, punch: 0.6, seed: 18 },
  cannon: { preset: 'punch', pitch: -6, length: 0.7, tone: -0.2, space: 0.2, punch: 0.8, seed: 19 },
  reflect: { preset: 'laser', pitch: 5, length: 0.5, tone: 0.5, space: 0.15, punch: 0.6, seed: 20 },
  hurt: { preset: 'error', pitch: -3, length: 0.5, tone: 0, space: 0.1, punch: 0.7, seed: 21 },
  miss: { preset: 'downer', pitch: 0, length: 0.9, tone: 0, space: 0.3, punch: 0.6, seed: 22 },
  morph: { preset: 'magic', pitch: 5, length: 0.3, tone: 0.4, space: 0.15, punch: 0.5, seed: 23 },
  deny: { preset: 'blip', pitch: -9, length: 0.8, tone: -0.3, space: 0, punch: 0.5, seed: 24 },
  forced: { preset: 'sparkle', pitch: 0, length: 0.6, tone: 0.3, space: 0.3, punch: 0.4, seed: 25 },
  magnet: { preset: 'laser', pitch: -14, length: 0.35, tone: -0.2, space: 0.1, punch: 0.5, seed: 26 },
  slime: { preset: 'bubble', pitch: -7, length: 0.8, tone: -0.2, space: 0.05, punch: 0.5, seed: 27 },
  bossHit: { preset: 'impact', pitch: 2, length: 0.5, tone: 0.3, space: 0.3, punch: 1, seed: 28 },
  bossDown: { preset: 'explosion', pitch: -3, length: 1.6, tone: 0, space: 0.5, punch: 1, seed: 29 },
  explode: { preset: 'explosion', pitch: 3, length: 0.5, tone: 0.2, space: 0.3, punch: 0.7, seed: 30 },
  bossWarn: { preset: 'braam', pitch: 0, length: 0.45, tone: 0, space: 0.3, punch: 0.6, seed: 31 },
  charge: { preset: 'riser', pitch: 0, length: 0.35, tone: 0.2, space: 0.2, punch: 0.4, seed: 32 },
  thunder: { preset: 'explosion', pitch: 6, length: 0.8, tone: 0.6, space: 0.5, punch: 1, seed: 33 },
  wind: { preset: 'wind', pitch: 0, length: 0.5, tone: 0.2, space: 0.2, punch: 0.3, seed: 34 },
  freeze: { preset: 'sparkle', pitch: -5, length: 0.8, tone: 0.6, space: 0.4, punch: 0.5, seed: 35 },
  goal: { preset: 'success', pitch: 0, length: 1, tone: 0.3, space: 0.3, punch: 0.6, seed: 36 },
  coin: { preset: 'coin', pitch: 0, length: 0.8, tone: 0.3, space: 0.1, punch: 0.5, seed: 37 },
  ui: { preset: 'tap', pitch: 3, length: 1, tone: 0.2, space: 0.05, punch: 0.5, seed: 38 },
  uiBack: { preset: 'click', pitch: -5, length: 1, tone: -0.2, space: 0.05, punch: 0.5, seed: 39 },
  uiStart: { preset: 'powerup', pitch: 0, length: 0.8, tone: 0.3, space: 0.3, punch: 0.6, seed: 40 },
  reward: { preset: 'success', pitch: 5, length: 1.4, tone: 0.4, space: 0.5, punch: 0.6, seed: 41 },
};

const meta = { bgm: {}, se: Object.keys(SE) };
for (const [k, v] of Object.entries(BGM)) {
  const loop = v._loop; delete v._loop;
  writeFileSync(`${root}audio/src/bgm/${k}.json`, JSON.stringify(v));
  meta.bgm[k] = loop ? { loopStart: (loop.bars * 4 * 60) / loop.bpm, loopEnd: (loop.bars * 8 * 60) / loop.bpm } : { loop: false };
}
for (const [k, v] of Object.entries(SE)) writeFileSync(`${root}audio/src/se/${k}.json`, JSON.stringify(v, null, 1));
writeFileSync(`${root}audio/src/meta.json`, JSON.stringify(meta, null, 1));
console.log(`BGM ${Object.keys(BGM).length} 曲 / 効果音 ${Object.keys(SE).length} 個を書き出しました`);
