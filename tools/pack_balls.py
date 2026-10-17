#!/usr/bin/env python3
"""ボール画像 18 枚を 1 枚のアトラス（768x384, 6列x3行, 各128px）にまとめる。

  python3 tools/pack_balls.py <入力フォルダ> [出力PNG]

入力フォルダには soccer.png, marble.png ... dandelion.png（balls_atlas.json の ID 名）を置く。
各画像は透過部分を切り落とし、セルの中央に最大 116px で収める（ラグビー球は横長のまま）。
ゲームは各セルの不透明部分の大きさを自動で測ってコライダー半径に合わせるので、
アトラスの JSON（座標・コライダー）は変更不要。必要なら Pillow を入れる: pip install pillow
"""
import sys
from pathlib import Path
from PIL import Image

ORDER = ['soccer', 'marble', 'pingpong', 'bowling', 'bubble', 'fire', 'rugby', 'magnet', 'slime',
         'baseball', 'basketball', 'volleyball', 'tennis', 'golf', 'beach', 'glass', 'spike', 'dandelion']
CELL, FIT = 128, 116

src = Path(sys.argv[1])
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'assets/atlas/balls_atlas.png')
atlas = Image.new('RGBA', (CELL * 6, CELL * 3), (0, 0, 0, 0))
for i, name in enumerate(ORDER):
    p = next((q for q in [src / f'{name}.png', src / f'{name}.webp'] if q.exists()), None)
    if not p:
        print(f'!! {name}.png がありません（スキップ）')
        continue
    im = Image.open(p).convert('RGBA')
    bbox = im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    k = FIT / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    x = (i % 6) * CELL + (CELL - im.width) // 2
    y = (i // 6) * CELL + (CELL - im.height) // 2
    atlas.alpha_composite(im, (x, y))
    print(f'{name:11s} ← {p.name}  {im.width}x{im.height}')
atlas.save(out)
print(f'書き出し: {out}')
