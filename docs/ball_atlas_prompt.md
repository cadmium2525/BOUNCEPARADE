# ボールアトラス再生成プロンプト

## 現在のアトラス（`03_Ball_Atlas/balls_atlas.png`）の問題点

| 問題 | 内容 |
|---|---|
| 画風の不一致 | フラットな記号アイコン調で、コンセプトボード（立体感のある光沢カートゥーン＋太い輪郭）と合っていない |
| 大きさのばらつき | ビー玉は直径約20px、ボウリング球は約80pxなど、128pxのセルに対する占有率がバラバラ。小さい球は拡大すると粗くなる |
| モチーフが伝わりにくい | サッカーボールが五角形1つ＋点、ピンポン玉・ガラス玉が単なる丸、磁石ボールが何か分からない、など |
| 立体感がない | ハイライト・陰影が最小限で、ゲーム画面で背景に埋もれる |

ゲーム側は**各セルの不透明部分を自動で測ってコライダー半径に合わせて描画**するため、新しい画像は「すべての球をセルいっぱい（直径約116px）」に描けば、JSON を直さずにそのまま差し替えられます。

---

## 方法A：1枚で生成する（推奨：レイアウトを厳守できる画像生成AI向け）

```
A game sprite sheet of 18 different balls for a 2D mobile platformer, arranged in an exact grid of 6 columns and 3 rows on a fully transparent background (PNG with alpha). Canvas 768x384 pixels, each cell exactly 128x128 pixels, every ball perfectly centered in its own cell and filling it to about 116 pixels in diameter (6 px transparent margin), no ball touching or crossing a cell border. No grid lines, no text, no labels, no numbers, no drop shadows, no background, no floor.

Art style: polished, glossy cartoon game art, chunky and readable at small size, bold dark navy outline (#1b1b2e, about 4 px), soft cel shading with a strong specular highlight, single light source from the upper-left, saturated cheerful colors, consistent style across all 18 balls, front view (no perspective tilt), like a premium Nintendo-style casual platformer.

Row 1 (left to right):
1. Soccer ball – classic white ball with black pentagon panels and curved seams.
2. Glass marble – clear glass sphere with a swirling teal-and-rainbow ribbon inside, bright glint.
3. Ping-pong ball – matte off-white celluloid ball with a subtle equator seam and a tiny orange logo dot.
4. Bowling ball – deep glossy purple-black ball with three finger holes and faint marbled swirls.
5. Soap bubble – transparent iridescent bubble with rainbow film reflections, mostly see-through (semi-transparent alpha), bright white highlight.
6. Fireball – glowing orange-yellow ball of fire with short flame tongues around it; the flames stay inside the cell.

Row 2:
7. Rugby ball (American-football shape) – brown leather ellipse lying horizontally, about 120x68 px, white laces and white stripes near both tips.
8. Magnet ball – sphere split into a red half and a blue half with "N" and "S" style markings and a silver metallic band.
9. Slime ball – translucent green jelly sphere with a cute simple face (two dot eyes and a small smile) and glossy wet highlight.
10. Baseball – white leather ball with red curved double stitches.
11. Basketball – orange ball with black seam lines and pebbled texture.
12. Volleyball – white, yellow and blue curved panels.

Row 3:
13. Tennis ball – fluorescent yellow-green felt ball with a white curved seam, slightly fuzzy edge.
14. Golf ball – white ball with a dimpled surface.
15. Beach ball – inflatable ball with red, yellow, blue and white wedge stripes and a white cap.
16. Crystal glass ball – clear crystal sphere with refraction and caustic highlights, light blue tint.
17. Spiked iron ball – dark steel sphere with 10 sharp metallic spikes; the spike tips stay inside the cell.
18. Dandelion puff ball – a fluffy round white dandelion seed head made of fine radiating seeds, soft and airy, no stem.
```

### ネガティブプロンプト（指定できる場合）

```
text, letters, numbers, watermark, signature, grid lines, cell borders, background color, checkerboard, floor, cast shadow, cropped ball, overlapping balls, perspective, 3d render, photo, blurry, low resolution, inconsistent style
```

---

## 方法B：1球ずつ生成して自動でまとめる（グリッドを守れないAIの場合）

下のテンプレートの `{BALL}` を18回差し替えて生成し、`balls_src/` に **ID名.png**（`soccer.png` など）で保存してから、

```sh
pip install pillow
python3 tools/pack_balls.py balls_src assets/atlas/balls_atlas.png
```

を実行すると、透過の余白を切り落としてセル中央に揃えた `balls_atlas.png`（768x384）が出来上がります。

```
A single game sprite of {BALL}, centered on a fully transparent background (PNG with alpha), 512x512 pixels, the ball fills about 90% of the image. Polished glossy cartoon game art for a 2D mobile platformer, bold dark navy outline (#1b1b2e), soft cel shading with a strong specular highlight, light from the upper-left, saturated cheerful colors, front view. No text, no shadow, no background, no floor.
```

| ID | {BALL} に入れる文 |
|---|---|
| soccer | a classic white soccer ball with black pentagon panels and curved seams |
| marble | a clear glass marble with a swirling teal-and-rainbow ribbon inside |
| pingpong | a matte off-white ping-pong ball with a subtle seam and a tiny orange logo dot |
| bowling | a deep glossy purple-black bowling ball with three finger holes |
| bubble | a transparent iridescent soap bubble with rainbow film reflections, mostly see-through |
| fire | a glowing orange-yellow fireball with short flame tongues around it |
| rugby | a brown leather rugby / american football lying horizontally, white laces and stripes (wide ellipse, about 16:9) |
| magnet | a magnet ball split into a red half and a blue half with N and S markings and a silver band |
| slime | a translucent green jelly slime ball with a cute simple face |
| baseball | a white baseball with red curved double stitches |
| basketball | an orange basketball with black seam lines |
| volleyball | a volleyball with white, yellow and blue curved panels |
| tennis | a fluorescent yellow-green tennis ball with a white curved seam |
| golf | a white dimpled golf ball |
| beach | an inflatable beach ball with red, yellow, blue and white wedge stripes |
| glass | a clear crystal glass ball with refraction highlights and a light blue tint |
| spike | a dark steel ball covered with ten sharp metallic spikes |
| dandelion | a fluffy round white dandelion seed head, soft and airy, no stem |

---

## 差し替え後のチェック

1. `assets/atlas/balls_atlas.png` を上書き（`devkit/03_Ball_Atlas/` 側も揃えるなら同様に）。
2. ゲームの「ボール図鑑」で18球の見た目・大きさを確認。
3. 炎やトゲなど本体より外に飛び出す飾りがある球は、本体が小さく見える場合があります。`js/balls.js` の `spriteScale`（火の玉・トゲ鉄球は 1.3）で調整できます。
