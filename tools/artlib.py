"""生成画像の切り出し共通処理：不透明部分を「つながった塊」に分け、重心がいちばん近いセルへ割り当てる。"""
from collections import deque
import numpy as np
from PIL import Image


def split_cells(img, cols, rows, alpha_min=8):
    A = np.array(img.convert('RGBA'))
    H, W = A.shape[:2]
    cw, ch = W / cols, H / rows
    mask = A[:, :, 3] > alpha_min
    lab = np.zeros((H, W), np.int32)
    owner = {}
    n = 0
    for y0 in range(H):
        for x0 in np.nonzero(mask[y0] & (lab[y0] == 0))[0]:
            if lab[y0, x0]:
                continue
            n += 1
            q = deque([(y0, x0)]); lab[y0, x0] = n
            sx = sy = cnt = 0
            while q:
                y, x = q.popleft(); sx += x; sy += y; cnt += 1
                for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
            mx, my = sx / cnt, sy / cnt
            owner[n] = min(range(cols * rows), key=lambda i: (mx - ((i % cols) + .5) * cw) ** 2 + (my - ((i // cols) + .5) * ch) ** 2)
    lut = np.full(n + 1, -1, np.int32)
    for k, v in owner.items():
        lut[k] = v
    cell_of = np.where(lab > 0, lut[lab], -1)
    out = []
    for i in range(cols * rows):
        sel = cell_of == i
        ys, xs = np.nonzero(sel)
        if len(xs) == 0:
            out.append(None); continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = A[y0:y1, x0:x1].copy()
        crop[~sel[y0:y1, x0:x1]] = 0
        out.append(Image.fromarray(crop))
    return out


def fit(im, max_side):
    k = max_side / max(im.size)
    if k >= 1:
        return im
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
