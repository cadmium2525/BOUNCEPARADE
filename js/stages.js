import { Builder } from './level.js';
import { Sign, Platform } from './entities.js';
import { TILE } from './consts.js';

// ステージは高さ 26 タイル。地面の上端は基本 21 行目。
// 到達の目安：サッカー=最大約7.8タイル上 / ピンポン=約12.6タイル / バネ=約14タイル / プルン=約12タイル
const H = 26;

function coins(b, x0, x1, y, step = 2) { for (let x = x0; x <= x1; x += step) b.set(x, y, 'C'); }
function arc(b, x0, x1, y, h, step = 2) {
  for (let x = x0; x <= x1; x += step) { const t = (x - x0) / Math.max(1, x1 - x0); b.set(x, Math.round(y - Math.sin(t * Math.PI) * h), 'C'); }
}
function sign(b, x, y, text) { b.add({ ch: 'sign', x, y, make: () => new Sign(x * TILE + 8, y * TILE + 8, text) }); }
function plat(b, x, y, axis, range, speed, w = 3, phase = 0) {
  b.add({ ch: 'plat', x, y, make: () => new Platform(x * TILE + 8, y * TILE + 8, axis, range, speed, w, phase) });
}
// ボス部屋：ゲート列 gx、右端 x1、天井 0..ceil、床の上端 floor
function arena(b, gx, x1, floor, ceil = 4, floorCh = '#') {
  b.fill(gx, 0, x1, ceil, '#');
  b.col(gx, ceil + 1, floor - 1, '!');
  b.ground(gx, x1, floor);
  if (floorCh !== '#') b.row(gx + 1, x1 - 1, floor, floorCh);
  b.fill(x1, 0, x1 + 1, H - 1, '#');
}

// ===== チュートリアル：はじまりの丘 =====
function tutorial() {
  const b = new Builder(H);
  b.ground(0, 19, 21);
  b.set(3, 20, 'P');
  sign(b, 6, 20, 'ボールは自動で跳ねる！ ◀ ▶ で空中の向きを変えよう');
  arc(b, 9, 17, 18, 3);
  b.ground(20, 27, 18);
  sign(b, 17, 20, '▲ を長押しすると高く跳ねる（離すと低く、▼で小さく）');
  b.ground(28, 35, 15);
  coins(b, 29, 34, 12);
  arc(b, 36, 40, 12, 3, 1);
  b.ground(41, 62, 18);
  sign(b, 44, 17, '右のボタンで変身！ ビー玉は転がる勢いのまま小さな穴へ入れる');
  // 小さなトンネルと発射装置
  b.fill(63, 6, 88, 16, '#');
  b.ground(63, 88, 18);
  b.set(68, 17, '>');
  coins(b, 72, 86, 17);
  sign(b, 57, 17, '発射装置で飛び出したら、すぐボウリング球に変身！ 重量壁をこわせ');
  // 重量壁の前の広場
  b.ground(89, 128, 18);
  b.set(94, 18, 'S'); // 床に埋めたバネ（転がる球は上を通過）
  sign(b, 97, 17, '勢いが足りなかったら、バネで上へ戻ってやり直そう');
  b.fill(111, 0, 112, 10, '#');
  b.fill(111, 11, 112, 17, 'H');
  coins(b, 114, 126, 16);
  sign(b, 118, 17, '重い球は跳ねない。サッカーボールに戻って跳ねよう');
  b.ground(129, 140, 15);
  sign(b, 136, 14, 'ピンポン玉なら、この高い壁も越えられる');
  b.ground(141, 146, 5);
  coins(b, 141, 146, 3);
  b.ground(147, 190, 18);
  sign(b, 150, 17, '敵は上から踏みつけて倒そう');
  b.set(158, 17, 'k'); b.set(168, 17, 'k');
  arc(b, 155, 171, 14, 3);
  b.set(182, 17, 'G');
  b.fill(191, 0, 192, H - 1, '#');
  return b;
}

// ===== 1. 工場 =====
function factory() {
  const b = new Builder(H);
  // A: 導入
  b.ground(0, 39, 21);
  b.set(3, 20, 'P');
  coins(b, 6, 12, 19);
  b.set(14, 20, 'k');
  b.ground(18, 27, 18);
  b.set(23, 17, 'g');
  sign(b, 16, 20, 'ガチガチは踏むとジャンプ台。横から触れるとダメージ');
  b.row(30, 34, 14, '=');
  coins(b, 30, 34, 12);
  b.set(36, 20, 'k');
  // B: プレス機の通路
  b.ground(40, 79, 21);
  b.fill(40, 0, 79, 7, '#');
  b.set(47, 8, 'T'); b.set(57, 8, 'T'); b.set(67, 8, 'T');
  coins(b, 44, 76, 19);
  b.set(52, 20, 'k'); b.set(72, 20, 'k');
  sign(b, 42, 20, 'プレス機は赤く光ったら落ちてくる');
  // C: 階段と重量床の縦穴（ボウリング球の強制区間）
  b.ground(80, 85, 21);
  b.ground(82, 85, 18);
  b.ground(86, 89, 14);
  b.ground(90, 95, 10);
  sign(b, 92, 9, '縦穴はボウリング球の強制区間。重さで床をぶち抜け！');
  b.ground(96, 99, 21);
  b.row(96, 99, 12, 'H');
  b.row(96, 99, 15, 'H');
  b.zone(96, 5, 99, 16, 2);
  b.fill(100, 0, 105, 16, '#');
  b.ground(100, 125, 21);
  coins(b, 97, 99, 19, 1);
  // D: 部屋とビー玉の U 字管（地面と壁を作ってから掘る）
  b.set(112, 20, 'n');
  b.set(108, 20, 'g');
  sign(b, 116, 20, 'ビー玉で床の小さな穴へ。発射装置が上まで運んでくれる');
  b.fill(126, 7, 135, 25, '#');
  b.clear(120, 21, 120, 22);
  b.clear(120, 23, 128, 23);
  b.clear(128, 0, 128, 22);
  b.set(120, 23, '>');
  b.set(128, 23, 'A');
  b.fill(121, 17, 121, 20, '='); // 転がる・飛んでくるビー玉を穴の上で止める壁（4マス：サッカーなら越えられる）
  coins(b, 122, 126, 23);
  // E: 高台の道
  b.ground(136, 146, 9);
  coins(b, 137, 145, 7);
  b.set(141, 6, 'd');
  b.row(150, 154, 11, '=');
  b.set(152, 8, 'd');
  b.row(158, 162, 13, '=');
  b.ground(147, 205, 21);
  b.set(156, 20, 'k');
  b.row(162, 168, 15, '=');
  b.set(165, 14, 'x');
  sign(b, 160, 20, 'スイッチを押すと扉がひらく');
  b.fill(175, 0, 176, 12, '#');
  b.fill(175, 13, 176, 20, 'D');
  b.set(170, 20, 'g');
  coins(b, 178, 188, 19);
  b.set(183, 20, 'n');
  b.set(193, 20, 'K');
  b.set(196, 20, 'h');
  // F: ボス部屋
  arena(b, 206, 247, 21);
  b.set(238, 20, '@');
  return b;
}

// ===== 2. 天空都市 =====
function sky() {
  const b = new Builder(H);
  b.ground(0, 14, 21);
  b.set(3, 20, 'P');
  b.row(9, 13, 17, '-');
  coins(b, 9, 13, 15);
  sign(b, 6, 20, '雲の床は下からすり抜けられる。落ちないように！');
  b.ground(21, 32, 19);
  b.set(30, 18, 'u');
  sign(b, 25, 18, '送風機の風に乗って上へ');
  arc(b, 15, 20, 15, 3, 1);
  b.fill(33, 6, 42, 8, '#');
  coins(b, 34, 41, 4);
  b.set(38, 5, 'k');
  plat(b, 48, 9, 'x', 3.5, 1.1);
  b.fill(55, 12, 66, 14, '#');
  b.set(60, 8, 'd');
  coins(b, 56, 65, 10);
  b.fill(70, 21, 74, 23, '#');
  b.set(72, 20, 'p');
  sign(b, 64, 11, 'プルンに乗ると大きく跳ね上がる');
  b.fill(76, 9, 86, 11, '#');
  b.set(84, 8, 'n');
  coins(b, 77, 82, 7);
  // シャボン玉の強制区間（大きな谷）
  sign(b, 79, 8, 'この先はシャボン玉の区間。▲で上昇、◀ ▶ でただよう');
  b.zone(88, 1, 108, 20, 3);
  arc(b, 90, 106, 9, 4);
  b.set(98, 6, 'd');
  b.fill(110, 14, 122, 16, '#');
  b.set(114, 13, 'K');
  // 雲の飛び石
  b.row(126, 129, 15, '-');
  b.row(133, 136, 12, '-');
  b.set(134, 9, 'C'); b.set(135, 9, 'C');
  b.row(140, 143, 14, '-');
  b.set(141, 9, 'd');
  b.fill(147, 17, 160, 19, '#');
  b.set(150, 16, 'k');
  b.set(158, 16, 'r');
  plat(b, 168, 16, 'x', 4, 1.2);
  coins(b, 163, 173, 13);
  b.ground(176, 205, 18);
  b.set(184, 17, 'g');
  b.set(190, 17, 'p');
  b.fill(193, 10, 198, 12, '#');
  coins(b, 193, 198, 8);
  b.set(201, 17, 'K');
  b.set(203, 17, 'h');
  // ボス部屋
  arena(b, 206, 245, 18, 2);
  b.set(211, 17, 'S'); b.set(240, 17, 'S');
  b.row(216, 219, 12, '-'); b.row(232, 235, 12, '-');
  b.set(226, 10, '@');
  return b;
}

// ===== 3. 火山 =====
function volcano() {
  const b = new Builder(H);
  b.ground(0, 40, 21);
  b.set(3, 20, 'P');
  b.fill(12, 21, 15, 25, 'L');
  arc(b, 11, 16, 17, 3, 1);
  sign(b, 7, 20, '溶岩に触れるとダメージ！');
  b.set(22, 20, 'k');
  b.ground(26, 33, 18);
  b.set(30, 17, 't');
  sign(b, 25, 17, 'トゲマルには触れないで。跳び越えよう');
  // 上昇気流と溶岩の湖
  b.ground(41, 48, 21);
  b.fill(49, 22, 66, 25, 'L');
  b.set(52, 21, 'u'); b.set(61, 21, 'u');
  b.row(55, 58, 12, '=');
  coins(b, 55, 58, 10);
  b.ground(67, 82, 21);
  sign(b, 44, 20, '噴き上がる熱風に乗って溶岩を渡ろう');
  b.set(75, 20, 'n');
  // 火の玉の強制区間（溶岩の大きな湖）
  sign(b, 80, 20, 'この先は火の玉の区間。溶岩の上でも跳ねられる！');
  b.fill(84, 21, 112, 25, 'L');
  b.fill(92, 15, 93, 20, '#');
  b.fill(102, 15, 103, 20, '#');
  b.row(97, 98, 10, '=');
  b.zone(84, 3, 112, 20, 5);
  arc(b, 85, 91, 15, 4);
  arc(b, 94, 101, 11, 4);
  arc(b, 104, 111, 15, 4);
  b.ground(113, 135, 21);
  b.set(122, 20, 't');
  b.ground(128, 135, 17);
  b.set(131, 16, 'n');
  // 溶ける岩の部屋（火の玉で通れる隠し部屋）
  b.ground(136, 175, 21);
  b.fill(140, 13, 152, 15, '#');
  b.fill(140, 16, 140, 20, 'B');
  b.fill(152, 16, 152, 20, 'B');
  coins(b, 142, 150, 19);
  b.set(146, 20, 'h');
  sign(b, 137, 20, '冷えた岩は火の玉で溶かせる');
  b.row(156, 160, 16, '=');
  b.set(158, 12, 'd');
  b.set(165, 20, 't');
  b.fill(168, 17, 170, 20, '#');
  b.ground(176, 205, 21);
  b.fill(179, 21, 183, 25, 'L');
  b.set(189, 20, 'g');
  b.set(196, 20, 'K');
  b.set(199, 20, 'h');
  // ボス部屋
  arena(b, 206, 245, 21);
  b.row(207, 210, 16, '='); b.set(208, 15, 'x');
  b.row(241, 244, 16, '='); b.set(243, 15, 'x');
  b.set(226, 20, '@');
  return b;
}

// ===== 4. 遊園地 =====
function amusement() {
  const b = new Builder(H);
  b.ground(0, 40, 21);
  b.set(3, 20, 'P');
  b.set(11, 15, 'O'); b.set(15, 12, 'O'); b.set(19, 15, 'O'); b.set(23, 12, 'O');
  coins(b, 10, 24, 9);
  sign(b, 7, 20, 'バンパーで弾んで遊ぼう！');
  b.set(30, 20, 'k'); b.set(36, 20, 'p');
  // バネの塔
  b.ground(44, 46, 17); b.set(45, 16, 'S');
  coins(b, 48, 52, 6);
  b.ground(54, 56, 19); b.set(55, 18, 'p');
  b.ground(64, 66, 15); b.set(65, 14, 'S');
  coins(b, 58, 62, 8);
  b.ground(70, 82, 21);
  b.set(76, 20, 'g');
  // ラグビー球の強制区間
  sign(b, 72, 20, 'この先はラグビーボールの区間。不規則なバウンドを乗りこなせ！');
  b.ground(83, 112, 21);
  b.zone(84, 4, 110, 20, 9);
  b.set(90, 14, 'O'); b.set(97, 11, 'O'); b.set(104, 14, 'O');
  b.fill(93, 18, 94, 20, '#'); b.fill(100, 17, 101, 20, '#');
  coins(b, 86, 108, 7);
  arc(b, 95, 99, 16, 3, 1);
  // 動く床の谷
  b.ground(113, 120, 21);
  b.set(117, 20, 'n');
  plat(b, 126, 17, 'x', 3, 1.0);
  plat(b, 138, 14, 'y', 3, 1.3, 3, 1);
  plat(b, 150, 17, 'x', 3, 1.2, 3, 2);
  b.set(132, 10, 'd'); b.set(146, 9, 'd');
  coins(b, 124, 154, 11, 3);
  b.ground(157, 205, 21);
  b.set(163, 20, 'k'); b.set(168, 20, 'g');
  b.set(173, 14, 'O'); b.set(178, 11, 'O');
  b.row(180, 186, 13, '=');
  coins(b, 180, 186, 11);
  b.set(190, 20, 'p');
  b.set(197, 20, 'K');
  b.set(200, 20, 'h');
  // ボス部屋
  arena(b, 206, 245, 21);
  b.set(209, 15, 'O'); b.set(242, 15, 'O'); b.set(209, 10, 'O'); b.set(242, 10, 'O');
  b.set(212, 20, 'S'); b.set(239, 20, 'S');
  b.set(226, 20, '@');
  return b;
}

// ===== 5. 地下鉱山 =====
function mine() {
  const b = new Builder(H);
  b.fill(0, 0, 49, 5, '#');
  b.ground(0, 49, 21);
  b.set(3, 20, 'P');
  b.set(14, 20, 'k'); b.set(22, 20, 't');
  b.row(26, 32, 16, '-');
  coins(b, 26, 32, 14);
  b.set(38, 20, 'g');
  // ビー玉のトロッコ通路
  sign(b, 44, 20, 'ビー玉でトンネルへ。発射装置が一気に運ぶ');
  b.fill(50, 0, 79, 19, '#');
  b.ground(50, 79, 21);
  b.set(49, 20, '>'); // 入口の手前：入口の前で止まったビー玉も吸い込む
  coins(b, 57, 77, 20);
  // 通路の出口：勢いのついたビー玉を段差で止める
  b.ground(80, 97, 21);
  b.fill(80, 0, 125, 8, '#');
  b.fill(90, 19, 91, 20, '#');
  b.set(94, 20, 'k');
  // 磁石ボールの強制区間：天井の磁気レールを伝って、トゲの谷を越える
  sign(b, 86, 20, '磁石ボールの区間。▲ を押している間、天井のレールに吸い付く');
  b.fill(98, 9, 125, 12, '#');
  b.row(98, 125, 13, 'M');
  b.ground(98, 125, 22);
  b.row(98, 125, 21, '^');
  b.zone(98, 14, 125, 20, 6);
  coins(b, 101, 123, 16, 3);
  // 足場とスイッチと扉
  b.ground(126, 205, 21);
  b.fill(126, 0, 170, 6, '#');
  b.set(132, 20, 'n');
  b.row(140, 145, 17, '-');
  b.row(148, 153, 13, '-');
  b.set(151, 12, 'x');
  b.row(155, 159, 16, '-');
  b.fill(163, 7, 164, 20, 'D');
  b.set(143, 20, 't'); b.set(157, 20, 'g');
  sign(b, 137, 20, 'スイッチは高い足場の上');
  coins(b, 148, 153, 11);
  // 重量スイッチの隠し部屋（ボウリング球が必要）
  b.row(172, 175, 17, '='); b.set(174, 16, 'X');
  b.fill(180, 14, 188, 15, '#');
  b.fill(180, 16, 180, 20, 'D');
  b.fill(188, 16, 188, 20, '#');
  coins(b, 182, 186, 19, 1);
  b.set(184, 17, 'h');
  b.set(192, 20, 'k');
  b.set(197, 20, 'K');
  b.set(200, 20, 'h');
  b.fill(171, 0, 205, 4, '#');
  // ボス部屋
  arena(b, 206, 245, 21);
  b.row(207, 210, 16, '='); b.set(208, 15, 'x');
  b.row(241, 244, 16, '='); b.set(243, 15, 'x');
  b.set(226, 20, '@');
  return b;
}

// ===== 6. 氷雪城 =====
function ice() {
  const b = new Builder(H);
  b.ground(0, 40, 21);
  b.set(3, 20, 'P');
  b.set(15, 20, 'k');
  b.ground(20, 26, 18);
  b.set(23, 17, 'p');
  b.row(28, 33, 11, '-');
  coins(b, 28, 33, 9);
  b.set(36, 20, 't');
  // 氷のすべり台からトンネルへ
  b.ground(41, 70, 21);
  b.row(41, 70, 21, 'I');
  sign(b, 42, 20, '氷の上ではビー玉がほとんど減速しない。勢いのままトンネルへ！');
  coins(b, 46, 68, 19, 3);
  b.fill(71, 0, 80, 19, '#');
  b.ground(71, 80, 21);
  b.row(71, 80, 21, 'I');
  coins(b, 72, 79, 20);
  // スライムの強制区間：縦穴をよじ登る
  b.ground(81, 92, 21);
  sign(b, 82, 20, '縦穴はスライム球の区間。壁に吸着、▲ で反対側へ跳ぶ');
  b.fill(86, 6, 87, 17, '#');
  b.fill(93, 6, 120, 25, '#');
  b.zone(88, 4, 92, 20, 7);
  coins(b, 89, 91, 12, 1);
  coins(b, 94, 118, 4, 3);
  b.set(108, 5, 'k');
  // 城の中
  b.ground(121, 205, 21);
  b.row(124, 140, 21, 'I');
  b.set(128, 20, 'g'); b.set(136, 20, 't');
  b.row(142, 146, 16, '=');
  b.set(144, 12, 'd');
  b.fill(150, 12, 160, 13, '=');
  b.fill(150, 14, 150, 20, 'B');
  b.fill(160, 14, 160, 20, 'B');
  coins(b, 152, 158, 19);
  b.set(155, 20, 'h');
  sign(b, 147, 20, '氷のブロックは火の玉で溶かせる');
  b.set(166, 20, 'n');
  b.ground(170, 176, 17);
  b.set(173, 16, 'p');
  b.row(178, 184, 12, '-');
  b.set(181, 8, 'd');
  b.set(190, 20, 'k');
  b.set(197, 20, 'K');
  b.set(200, 20, 'h');
  // ボス部屋（氷の床）
  arena(b, 206, 245, 21, 4, 'I');
  b.set(232, 20, '@');
  return b;
}

// ===== 最終：パレードタワー =====
function finale() {
  const b = new Builder(H);
  b.ground(0, 30, 21);
  b.set(3, 20, 'P');
  sign(b, 6, 20, '最後のステージ。すべてのボールの力を合わせよう！');
  b.set(14, 20, 'k'); b.set(20, 20, 'g');
  b.ground(24, 30, 18);
  // 1) ビー玉 → 発射装置 → ボウリング球 → 重量壁
  b.ground(31, 50, 18);
  b.fill(51, 7, 74, 16, '#');
  b.ground(51, 74, 18);
  b.set(54, 17, '>');
  coins(b, 58, 72, 17);
  b.ground(75, 110, 18);
  b.set(79, 18, 'S');
  b.fill(96, 0, 97, 9, '#');
  b.fill(96, 10, 97, 17, 'H');
  sign(b, 46, 17, '象徴コンボ：ビー玉で発射 → 出口でボウリング球 → 重量壁を破壊！');
  b.fill(104, 0, 105, 12, '#');
  b.fill(104, 13, 105, 17, 'H');
  coins(b, 98, 103, 16);
  // 2) シャボン玉の谷
  b.set(108, 17, 'K');
  b.zone(112, 1, 134, 20, 3);
  b.set(120, 18, 'u'); b.fill(119, 19, 121, 19, '=');
  b.set(127, 6, 'd');
  arc(b, 113, 133, 8, 4);
  b.fill(136, 12, 150, 25, '#');
  // 3) 火の玉の溶岩湖
  b.fill(151, 21, 178, 25, 'L');
  b.fill(151, 12, 151, 20, '#');
  b.zone(152, 3, 177, 20, 5);
  b.fill(160, 15, 161, 20, '#');
  b.fill(169, 14, 170, 20, '#');
  arc(b, 152, 159, 14, 4); arc(b, 162, 168, 10, 5); arc(b, 171, 177, 14, 4);
  b.ground(179, 196, 21);
  b.set(186, 20, 't');
  b.set(193, 20, 'K');
  // 4) ラグビーのバンパー場
  b.ground(197, 230, 21);
  b.zone(198, 4, 226, 20, 9);
  b.set(203, 14, 'O'); b.set(210, 10, 'O'); b.set(217, 14, 'O'); b.set(223, 10, 'O');
  b.fill(206, 17, 207, 20, '#'); b.fill(214, 15, 215, 20, '#'); b.fill(221, 17, 222, 20, '#');
  coins(b, 200, 224, 7, 3);
  // 5) 磁気レールとトゲの谷
  b.fill(231, 0, 268, 8, '#');
  b.ground(231, 235, 21);
  b.row(236, 264, 13, 'M');
  b.fill(236, 9, 264, 12, '#');
  b.ground(236, 264, 22);
  b.row(236, 264, 21, '^');
  b.zone(236, 14, 264, 20, 6);
  coins(b, 238, 262, 16, 3);
  b.ground(265, 280, 21);
  b.set(272, 20, 'K');
  // 6) スライムの縦穴
  b.fill(281, 6, 282, 17, '#');
  b.ground(281, 287, 21);
  b.fill(288, 6, 330, 25, '#');
  b.zone(283, 4, 287, 20, 7);
  b.set(296, 5, 'g'); b.set(304, 5, 'k');
  coins(b, 290, 310, 4, 2);
  b.clear(312, 6, 316, 7);
  b.row(312, 316, 8, '^');
  b.set(320, 5, 'p');
  b.set(326, 5, 'h');
  // 7) フィナーレ
  b.ground(331, 380, 21);
  b.set(340, 20, 'n'); b.set(348, 20, 'k'); b.set(352, 20, 'g'); b.set(358, 14, 'd');
  b.set(345, 14, 'O'); b.set(355, 11, 'O');
  arc(b, 360, 372, 14, 5);
  b.set(375, 20, 'G');
  b.fill(381, 0, 382, H - 1, '#');
  return b;
}

export const STAGES = [
  { id: 'tutorial', name: 'はじまりの丘', theme: 'grass', bgm: 'grass', build: tutorial, trial: ['bowling'], desc: 'ジャンプ → ビー玉 → 発射装置 → ボウリング球 → 壁破壊を体験' },
  { id: 'factory', name: '工場', theme: 'factory', bgm: 'factory', build: factory, boss: 'drill_rhino', reward: 'bowling', desc: 'プレス機・重量床・発射装置' },
  { id: 'sky', name: '天空都市', theme: 'sky', bgm: 'sky', build: sky, boss: 'storm_cloud', reward: 'bubble', desc: '送風機・動く床・雲の足場' },
  { id: 'volcano', name: '火山', theme: 'volcano', bgm: 'volcano', build: volcano, boss: 'magma_golem', reward: 'fire', desc: '溶岩・熱風・冷却装置' },
  { id: 'amusement', name: '遊園地', theme: 'amusement', bgm: 'amusement', build: amusement, boss: 'bumper_spider', reward: 'rugby', desc: 'バンパー・バネ・反射角' },
  { id: 'mine', name: '地下鉱山', theme: 'mine', bgm: 'mine', build: mine, boss: 'mogu_driller', reward: 'magnet', desc: '磁気レール・発射装置・スイッチ' },
  { id: 'ice', name: '氷雪城', theme: 'ice', bgm: 'ice', build: ice, boss: 'freeze_king', reward: 'slime', desc: '氷の床・吸着・凍結' },
  { id: 'final', name: 'パレードタワー', theme: 'final', bgm: 'final', build: finale, desc: 'すべての能力を組み合わせる最終ステージ' },
];

export function buildStage(st) {
  if (!st.built) {
    const b = st.build();
    st.built = { rows: b.toRows(), extra: b.extra, zones: b.zoneRects };
  }
  return st;
}
