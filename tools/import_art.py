#!/usr/bin/env python3
"""生成した画像をゲームに取り込む（assets/sprites/ に切り出し、manifest.json に登録）。

  python3 tools/import_art.py enemies  敵シート.png            # 3列x2行
  python3 tools/import_art.py gimmicks ギミックシート.png       # 4列x3行
  python3 tools/import_art.py boss drill_rhino ボス.png         # 左=通常 / 右=弱点露出 の2ポーズ
  python3 tools/import_art.py bg factory far 遠景.png           # far=不透明の遠景 / mid=透過の中景
  python3 tools/import_art.py logo ロゴ.png
  python3 tools/import_art.py remove boss_drill_rhino_normal    # 登録を外す（コード描画に戻る）

画像が登録されていない物は、これまでどおりコードで描画されます。
"""
import json, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from artlib import split_cells, fit

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'sprites'
MAN = OUT / 'manifest.json'
ENEMIES = ['korobot', 'gachigachi', 'fuwadrone', 'purun', 'togemaru', 'ponpon']
GIMMICKS = ['coin', 'heart', 'spring', 'bumper', 'launcher', 'switch', 'switch_heavy', 'press', 'checkpoint_off', 'checkpoint_on', 'goal', 'sign']
BOSSES = ['drill_rhino', 'storm_cloud', 'magma_golem', 'bumper_spider', 'mogu_driller', 'freeze_king']
THEMES = ['grass', 'factory', 'sky', 'volcano', 'amusement', 'mine', 'ice', 'final']

OUT.mkdir(parents=True, exist_ok=True)
man = json.loads(MAN.read_text()) if MAN.exists() else {}


def save(key, im, size=256, jpg=False):
    im = fit(im, size)
    name = f'{key}.jpg' if jpg else f'{key}.png'
    if jpg:
        im.convert('RGB').save(OUT / name, quality=86)
    else:
        im.save(OUT / name, optimize=True)
    man[key] = f'assets/sprites/{name}'
    print(f'{key:24s} {im.width}x{im.height}')


cmd = sys.argv[1]
if cmd == 'enemies':
    for k, im in zip(ENEMIES, split_cells(Image.open(sys.argv[2]), 3, 2)):
        if im: save(f'enemy_{k}', im)
elif cmd == 'gimmicks':
    for k, im in zip(GIMMICKS, split_cells(Image.open(sys.argv[2]), 4, 3)):
        if im: save(f'gimmick_{k}', im)
elif cmd == 'boss':
    bid = sys.argv[2]
    assert bid in BOSSES, f'ボス ID: {BOSSES}'
    normal, weak = split_cells(Image.open(sys.argv[3]), 2, 1)
    save(f'boss_{bid}_normal', normal, 384)
    save(f'boss_{bid}_weak', weak, 384)
elif cmd == 'bg':
    theme, layer = sys.argv[2], sys.argv[3]
    assert theme in THEMES and layer in ('far', 'mid')
    im = Image.open(sys.argv[4]).convert('RGBA')
    k = 720 / im.height
    im = im.resize((round(im.width * k), 720), Image.LANCZOS)
    save(f'bg_{theme}_{layer}', im, 4096, jpg=(layer == 'far'))
elif cmd == 'logo':
    save('logo', split_cells(Image.open(sys.argv[2]), 1, 1)[0], 1024)
elif cmd == 'remove':
    man.pop(sys.argv[2], None)
else:
    print(__doc__); sys.exit(1)
MAN.write_text(json.dumps(man, ensure_ascii=False, indent=1))
print('assets/sprites/manifest.json を更新しました')
