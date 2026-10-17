// 「かなでる」のエンジンで BGM・効果音を音にする。
//   KANADERU=/path/to/mp4mp3/daw node tools/sound/build.mjs [名前...]
// BGM は 3 周ぶんを描画し、2 周目の終わり + 0.5 秒で切る（ループ区間 = 2 周目。リバーブの余韻も含めて継ぎ目なし）。
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url).pathname;
const daw = process.env.KANADERU || '/home/user/cadmium2525/mp4mp3/daw';
const render = `${daw}/tools/render.mjs`;
if (!existsSync(render)) { console.error(`かなでるが見つかりません: ${render}`); process.exit(1); }
const only = new Set(process.argv.slice(2));
const meta = JSON.parse(readFileSync(`${root}audio/src/meta.json`, 'utf8'));
const tmp = `${root}audio/.tmp`;
mkdirSync(tmp, { recursive: true });
mkdirSync(`${root}audio/bgm`, { recursive: true });
mkdirSync(`${root}audio/se`, { recursive: true });

const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }); if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr}`); return r.stdout.toString(); };

// ループ終端の前後 ±60ms を、ループ始端の前後と同じ音にする（その手前 25ms はクロスフェード）。
// MP3 のエンコーダ遅延がブラウザごとに違っても、ジャンプの継ぎ目でプチノイズが出ない。
function crossfadeLoop(path, ls, le) {
  const buf = readFileSync(path);
  let off = 12, fmt = null, data = null;
  while (off < buf.length) {
    const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { ch: buf.readUInt16LE(off + 10), sr: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data') { data = { start: off + 8, size }; break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || fmt.bits !== 16) throw new Error('16bit WAV が必要です');
  const fr = fmt.ch * 2, a = Math.round(ls * fmt.sr), b = Math.round(le * fmt.sr);
  const F = Math.round(0.025 * fmt.sr), D = Math.round(0.06 * fmt.sr);
  const at = (i, c) => data.start + i * fr + c * 2;
  for (let i = -D - F; i < D; i++) {
    const w = i < -D ? (i + D + F + 1) / F : 1;
    for (let c = 0; c < fmt.ch; c++) {
      const v = buf.readInt16LE(at(b + i, c)) * (1 - w) + buf.readInt16LE(at(a + i, c)) * w;
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v))), at(b + i, c));
    }
  }
  writeFileSync(path, buf);
}

const manifest = { bgm: {}, se: {} };
for (const [name, m] of Object.entries(meta.bgm)) {
  const out = `audio/bgm/${name}.mp3`;
  if (!only.size || only.has(name)) {
    const wav = `${tmp}/${name}.wav`;
    const t0 = Date.now();
    run('node', [render, `${root}audio/src/bgm/${name}.json`, wav, '--bits', '16']);
    if (m.loop !== false) crossfadeLoop(wav, m.loopStart, m.loopEnd);
    const cut = m.loop === false ? [] : ['-t', String(m.loopEnd + 0.5)];
    run('ffmpeg', ['-v', 'error', '-y', '-i', wav, ...cut, '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', `${root}${out}`]);
    unlinkSync(wav);
    console.log(`BGM ${name}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  manifest.bgm[name] = m.loop === false ? { file: out, loop: false } : { file: out, loopStart: +m.loopStart.toFixed(5), loopEnd: +m.loopEnd.toFixed(5) };
}
for (const name of meta.se) {
  const out = `audio/se/${name}.wav`;
  if (!only.size || only.has(name)) {
    const wav = `${tmp}/${name}.wav`;
    run('node', [render, `${root}audio/src/se/${name}.json`, wav]);
    // 効果音は遅延のない WAV（モノラル 32kHz 16bit）
    run('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '32000', '-c:a', 'pcm_s16le', `${root}${out}`]);
    unlinkSync(wav);
  }
  manifest.se[name] = out;
}
writeFileSync(`${root}audio/manifest.json`, JSON.stringify(manifest, null, 1));
console.log('audio/manifest.json を更新しました');
