# ボール以外の画像生成プロンプト

ゲームは `assets/sprites/manifest.json` に登録された画像があればそれを使い、無ければこれまでどおりコードで描きます。**作った物から1つずつ差し替えられます。**
取り込みは `python3 tools/import_art.py ...`（Pillow と numpy が必要）。グリッドの線にぴったり揃っていなくても、塊ごとに一番近いマスへ自動で振り分けます。

優先度の目安：**① ボス → ② 敵 → ③ 背景 → ④ ギミック・アイテム → ⑤ タイトルロゴ**

## 共通スタイル（すべてのプロンプトの先頭に付ける）

```
Polished glossy cartoon game art for a 2D side-scrolling mobile platformer, same style as a premium Nintendo-style casual game: bold dark navy outline (#1b1b2e, thick and even), soft cel shading with strong specular highlights, single light source from the upper-left, saturated cheerful colors, cute but readable silhouettes, clean edges.
```

キャラクター・ギミック共通の決まり（プロンプト末尾に付ける）：

```
Fully transparent background (PNG with alpha). Every character faces RIGHT, full body visible, side view. No text, no letters, no numbers, no watermark, no ground, no cast shadow, no grid lines, objects do not touch or overlap each other.
```

---

## ① ボス（6体 × 2ポーズ、1体1枚）

1枚に **左＝通常ポーズ、右＝弱点が出たポーズ** を並べます。横長 2:1（例 1536×768）。

```
[共通スタイル] A boss character sprite sheet with exactly two poses of the same character side by side: LEFT = normal battle pose, RIGHT = vulnerable/stunned pose. Both poses the same size, same character design, each centered in its half. [BOSS] [共通の決まり]
```

| ID | [BOSS] |
|---|---|
| drill_rhino | A heavy mechanical rhinoceros robot with steel-blue armor plates, chunky legs and a big orange spiral drill as its horn, angry glowing eye. Stunned pose: drill stopped, dizzy X eyes, the armor plate on its back popped open revealing a glowing red-pink core. |
| storm_cloud | A huge angry storm cloud monster, dark purple-gray puffy body, small lightning sparks, fierce eyes. Stunned pose: the cloud is pale and deflated, sleepy closed eyes with "zz" feeling (no letters), a glowing pink weak spot on top of its head. |
| magma_golem | A tall rock golem made of dark basalt with glowing orange lava cracks, big fists. Vulnerable pose: frozen and cooled to icy blue-gray stone, frost on the surface, a glowing core exposed in the middle of its chest. |
| bumper_spider | A round purple robot spider whose FRONT half is a red-and-white pinball bumper ring, eight thin legs, red eyes. Stunned pose: dizzy spiral eyes, legs wobbly, a glowing pink weak spot visible on its back (left side). |
| mogu_driller | A chubby brown mole wearing a yellow mining helmet with a silver drill on top and big white claws. Stunned pose: helmet knocked off and tilted, dizzy X eyes, glowing pink weak spot on top of its head. |
| freeze_king | A tall ice king with a pale blue face, long white beard, gold crown, blue cape, holding a crystal scepter, carrying a large translucent ice shield on his FRONT (right) side. Tired pose: shield lowered, sweating, eyes half closed, his back (left side) glowing as the weak point. |

```sh
python3 tools/import_art.py boss drill_rhino ドリルライノ.png
```

## ② 通常敵（6体を 3列×2行、1枚）

横長 3:2（例 1536×1024）。

```
[共通スタイル] A sprite sheet of 6 small enemy characters arranged in a grid of 3 columns and 2 rows, one character centered in each cell, all at a similar scale, side view, facing right.
Row 1: (1) Korobot – a small orange round robot on two wheels with a dark visor and one cyan eye and a short antenna with a red tip. (2) Gachigachi – a low armored tank-like robot with a gray dome shell covered in short silver spikes, treads, red eye. (3) Fuwadrone – a small yellow hovering drone with a propeller on top and one big eye, little orange thruster flames below.
Row 2: (4) Purun – a pink jelly slime blob with a cute smile and glossy wobbly body. (5) Togemaru – a dark gray round ball covered in silver spikes with angry eyes. (6) Ponpon – a small cannon turret on a brown base with a gray round body, a dark barrel pointing right and angry eyes.
[共通の決まり]
```

```sh
python3 tools/import_art.py enemies 敵シート.png
```

## ③ 背景（ステージごと、遠景 1枚）

横に**継ぎ目なくループ**する横長の絵（例 2048×720、3:1 前後）。ゲームは高さに合わせて横に並べてスクロールします。地面や足場はゲーム側で描くので、**画面下 1/4 は手前に何も置かない遠景**にしてください。

```
[共通スタイル] A wide horizontally seamless tileable background for a 2D side-scrolling game, the left and right edges match perfectly so it can repeat endlessly. Distant scenery only, soft and slightly desaturated so foreground gameplay stands out, no characters, no text, no foreground ground or platforms, the lower quarter is simple distant hills or haze. [STAGE]
```

| テーマ | [STAGE] |
|---|---|
| grass | Bright sunny meadow, rolling green hills, round trees, fluffy white clouds, blue sky (starting stage). |
| factory | Industrial factory interior at dusk, silhouettes of chimneys, pipes, gears and conveyor frames, warm window lights, dark blue-purple tones. |
| sky | Sky city above the clouds, floating islands with white and gold towers, big fluffy clouds, bright blue sky. |
| volcano | Volcanic land, a big erupting volcano in the distance with glowing lava, dark red sky, smoke and rock spires. |
| amusement | Amusement park at sunset, ferris wheel, roller coaster rails, striped circus tents, pink-purple sky with sparkles. |
| mine | Underground mine cave, wooden support beams, hanging lanterns with warm glow, glowing colorful crystals in dark rock walls. |
| ice | Snowy ice castle land, frozen mountains, an ice palace with blue spires, pale blue sky with gentle snow. |
| final | A grand parade tower at night, festive towers with flags, fireworks, stars, purple-navy sky (final stage). |

```sh
python3 tools/import_art.py bg grass far 背景_grass.png
```

（透過の中景 `mid` も取り込めますが、透過の大きな絵は生成が難しいので遠景だけで十分です。遠景だけ入れたステージでは、コードの中景は自動で出なくなります。）

## ④ ギミック・アイテム（12個を 4列×3行、1枚）

横長 4:3（例 1600×1200）。

```
[共通スタイル] A sprite sheet of 12 game objects arranged in a grid of 4 columns and 3 rows, one object centered in each cell, front/side view.
Row 1: (1) a spinning gold coin seen from the front, (2) a red heart pickup, (3) a red bounce spring pad with a metal coil, (4) a round pinball bumper, red with a white ring and yellow center.
Row 2: (5) a small launcher cannon with an orange barrel pointing RIGHT, (6) a red floor push button on a gray base, (7) a heavy purple floor button on a thick steel base with a weight symbol, (8) a heavy steel press-machine block with yellow-black hazard stripes on its bottom edge (wide rectangle).
Row 3: (9) a checkpoint flag pole with a RED flag, (10) the same checkpoint flag pole with a GREEN flag, (11) a goal flag pole with a big rainbow flag and a star, tall, (12) a small wooden hint sign board with an exclamation mark.
[共通の決まり]
```

```sh
python3 tools/import_art.py gimmicks ギミックシート.png
```

## ⑤ タイトルロゴ

```
[共通スタイル] A game title logo that reads "BOUNCE PARADE", big bubbly rounded letters, "BOUNCE" in yellow-orange gradient and "PARADE" in light blue gradient, thick dark navy outline, a soccer ball replacing the letter O, small stars and a rainbow accent, fully transparent background, no other text.
```

```sh
python3 tools/import_art.py logo ロゴ.png
```

---

## 取り込み後

- 画像は `assets/sprites/` に保存され、`manifest.json` に登録されます。外したい物は `python3 tools/import_art.py remove <キー>`（例 `enemy_korobot`）。
- 向き：キャラクターは**右向き**で描いてもらえば、左向きはゲームが反転します。
- 大きさはゲーム側で決まった高さに合わせます（`js/sprites.js` の `ENEMY_H` / `BOSS_H`）。
- 予告マーク（！）、弱点の矢印、ピヨピヨの星、被弾の白い点滅、雷の予告などはコード側で上に重ねます。
