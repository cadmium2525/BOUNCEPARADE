#!/usr/bin/env python3
"""6列x3行で生成されたボール画像（任意サイズ・透過PNG）を、ゲーム用アトラス（256pxセル）に変換する。

  python3 tools/slice_balls.py <生成画像.png> [出力PNG]

グリッド線ぴったりに並んでいなくてもよい：不透明部分を「つながった塊」に分け、
各塊を重心がいちばん近いセルの球として扱う（はみ出した炎やトゲも正しい球に入る）。
"""
import sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from artlib import split_cells

ORDER = ['soccer', 'marble', 'pingpong', 'bowling', 'bubble', 'fire', 'rugby', 'magnet', 'slime',
         'baseball', 'basketball', 'volleyball', 'tennis', 'golf', 'beach', 'glass', 'spike', 'dandelion']
CELL, FIT = 256, 236

src = Image.open(sys.argv[1])
out_path = sys.argv[2] if len(sys.argv) > 2 else 'assets/atlas/balls_atlas.png'
cells = split_cells(src, 6, 3)
atlas = Image.new('RGBA', (CELL * 6, CELL * 3), (0, 0, 0, 0))
for i, name in enumerate(ORDER):
    im = cells[i]
    if im is None:
        print(f'!! {name} が見つかりません'); continue
    k = FIT / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    atlas.alpha_composite(im, ((i % 6) * CELL + (CELL - im.width) // 2, (i // 6) * CELL + (CELL - im.height) // 2))
    print(f'{name:11s} {im.width}x{im.height}')
atlas.save(out_path, optimize=True)
print('書き出し:', out_path, '（balls_atlas.json はセル 256px 用）')
