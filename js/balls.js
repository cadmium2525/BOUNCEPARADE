// ボールの定義。見た目・コライダー・基本物理は balls_atlas.json、
// 操作感と固有能力はここで定義する（データ駆動）。
//
// kind: bounce = 接地で自動バウンド / roll = 非反発（転がる・止まる） / float = ふわふわ / stick = 吸着
export const BALL_ORDER = [
  'soccer', 'marble', 'pingpong', 'bowling', 'bubble', 'fire', 'rugby', 'magnet', 'slime',
  'baseball', 'basketball', 'volleyball', 'tennis', 'golf', 'beach', 'glass', 'spike', 'dandelion',
];

export const STARTING_BALLS = ['soccer', 'marble', 'pingpong'];
export const REWARD_BALLS = ['bowling', 'bubble', 'fire', 'rugby', 'magnet', 'slime'];
export const BONUS_BALLS = ['baseball', 'basketball', 'volleyball', 'tennis', 'golf', 'beach', 'glass', 'spike', 'dandelion'];

const P = {
  soccer: { kind: 'bounce', bounceV: 520, g: 1, airAccel: 950, airMax: 230, airDrag: 700, wind: 1, desc: '基本の反発ボール。押し続けると高く跳ねる。' },
  marble: { kind: 'roll', g: 1, airAccel: 420, airMax: 140, friction: 55, wind: 0.5, desc: '小さく重い。せまい穴を通り、勢いを保って転がる。' },
  pingpong: { kind: 'bounce', bounceV: 560, g: 0.75, airAccel: 1150, airMax: 215, airDrag: 800, wind: 1.6, desc: '軽くてよく跳ねる。いちばん高く跳べる。弾をはね返す。', reflect: true },
  bowling: { kind: 'roll', g: 1.55, airAccel: 320, airMax: 120, friction: 110, wind: 0, heavy: true, desc: '重量で壁・装甲を壊す。風に流されない。' },
  bubble: { kind: 'float', g: 0.12, maxFall: 70, airAccel: 520, airMax: 150, airDrag: 300, wind: 3, rise: 900, riseMax: 150, desc: 'ふわりと漂う。押している間は上昇。' },
  fire: { kind: 'bounce', bounceV: 520, g: 1, airAccel: 950, airMax: 230, airDrag: 700, wind: 1, lavaProof: true, melt: true, spriteScale: 1.3, desc: '溶岩の上で跳ねられる。氷や木箱を溶かす。' },
  rugby: { kind: 'bounce', bounceV: 500, g: 1, airAccel: 900, airMax: 260, airDrag: 500, wind: 1, capsule: true, desc: '楕円形。不規則に跳ね、回転で前へ転がる。' },
  magnet: { kind: 'bounce', bounceV: 380, g: 1, airAccel: 800, airMax: 200, airDrag: 600, wind: 0.6, magnet: true, desc: '押している間、磁気レールに吸い付き伝って進む。' },
  slime: { kind: 'stick', g: 1, airAccel: 800, airMax: 200, airDrag: 600, wind: 0.8, desc: '壁や天井に吸着。押すと反対側へ跳び出す。' },
  baseball: { kind: 'bounce', bounceV: 430, g: 1, airAccel: 1300, airMax: 330, airDrag: 900, wind: 0.8, desc: '低い弾道で速い。' },
  basketball: { kind: 'bounce', bounceV: 600, g: 1.05, airAccel: 900, airMax: 220, airDrag: 650, wind: 1, desc: '力強いバウンド。' },
  volleyball: { kind: 'bounce', bounceV: 540, g: 0.85, airAccel: 1050, airMax: 225, airDrag: 750, wind: 1.3, reflect: true, desc: '軽く操作しやすい。弾をはね返す。' },
  tennis: { kind: 'bounce', bounceV: 560, g: 0.95, airAccel: 1100, airMax: 265, airDrag: 800, wind: 1.2, reflect: true, desc: '小さく速い。弾をはね返す。' },
  golf: { kind: 'bounce', bounceV: 330, g: 1.1, airAccel: 700, airMax: 300, airDrag: 300, wind: 0.6, desc: '小さく固い。遠くまで飛ぶ低い弾道。' },
  beach: { kind: 'bounce', bounceV: 470, g: 0.5, airAccel: 700, airMax: 170, airDrag: 400, wind: 2.2, desc: '大きく軽い。ゆっくり落ちる。' },
  glass: { kind: 'roll', g: 1, airAccel: 450, airMax: 150, friction: 8, wind: 0.6, desc: 'つるつる。ほとんど減速せずに転がる。' },
  spike: { kind: 'roll', g: 1.4, airAccel: 330, airMax: 130, friction: 160, wind: 0, heavy: true, spiky: true, spriteScale: 1.3, desc: '重く鋭い。触れた敵をすべて倒す。' },
  dandelion: { kind: 'float', g: 0.07, maxFall: 45, airAccel: 600, airMax: 170, airDrag: 260, wind: 4, rise: 700, riseMax: 120, desc: '風に乗って遠くへ。押すと上昇。' },
};

export function buildBallDefs(atlas) {
  const defs = {};
  for (const id of BALL_ORDER) {
    const s = atlas.sprites[id];
    const p = P[id];
    const c = s.collider;
    defs[id] = {
      id,
      name: s.name_ja,
      frame: s.frame,
      r: c.shape === 'ellipse' ? c.height / 2 : c.radius,
      halfLen: c.shape === 'ellipse' ? c.width / 2 - c.height / 2 : 0,
      hitR: c.shape === 'ellipse' ? (c.width + c.height) / 4 : c.radius,
      mass: s.physics.mass,
      rest: s.physics.restitution,
      ...p,
      g: (p.g ?? 1) * (s.physics.gravityScale ?? 1),
    };
  }
  return defs;
}
