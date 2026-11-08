# Move the level-3 costume accessories onto the team's new stage 1/2 art, lined up by the eyes.
# Run from foodymon/:
#   uv run --with pillow --with numpy --with opencv-python-headless python scripts/pet-costume-transfer.py 1 2
import sys, numpy as np, cv2
from PIL import Image, ImageFilter

KINDS = ['crown', 'ribbon', 'glasses', 'flower', 'wizard', 'bunny']
EYES = {1: [(387, 473), (628, 468)], 2: [(362, 453), (613, 449)]}  # on the 1024px stage art

def eyes_of(rgba):
    """The two eye centres: the biggest dark round blobs in the middle band."""
    a = np.array(rgba)
    dark = ((a[:, :, :3].max(axis=2) < 70) & (a[:, :, 3] > 200)).astype(np.uint8)
    h = a.shape[0]; dark[: h // 4] = 0; dark[int(h * 0.7):] = 0
    n, lab, st, cen = cv2.connectedComponentsWithStats(dark, 8)
    blobs = sorted([i for i in range(1, n) if 0.6 < st[i, 2] / max(st[i, 3], 1) < 1.6], key=lambda i: -st[i, 4])[:2]
    return sorted([tuple(cen[i]) for i in blobs])

def accessory(rgba, kind, eyes):
    a = np.array(rgba); hsv = cv2.cvtColor(a[:, :, :3], cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    mint = (abs(h - 78) < 16) & (s > 14)  # includes the pale highlight on the head
    m = ((a[:, :, 3] > 40) & ~mint).astype(np.uint8)
    ey = min(y for _, y in eyes); d = eyes[1][0] - eyes[0][0]
    if kind == 'glasses':
        m[: int(ey - d * 0.5)] = 0; m[int(ey + d * 0.45):] = 0
    else:
        m[int(ey - d * 0.12):] = 0  # head accessories sit above the eyes
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))  # drops the thin anti-aliased head outline
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > m.size * 0.002: keep[lab == i] = 255
    # fill each piece (lenses keep what they cover, i.e. the eyes behind them)
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(keep, cs, -1, 255, -1)
    out = a.copy(); out[:, :, 3] = np.minimum(a[:, :, 3], cv2.GaussianBlur(keep, (0, 0), 1))
    return Image.fromarray(out, 'RGBA')

for lv in map(int, sys.argv[1:]):
    base = Image.open(f'assets/images/level{lv}.png').convert('RGBA')
    (tx0, ty0), (tx1, ty1) = EYES[lv]
    for k in KINDS:
        src = Image.open(f'assets/images/costume/level3/{k}.png').convert('RGBA')
        (sx0, sy0), (sx1, sy1) = eyes_of(src)
        acc = accessory(src, k, [(sx0, sy0), (sx1, sy1)])
        sc = (tx1 - tx0) / (sx1 - sx0)
        acc = acc.resize((round(acc.width * sc), round(acc.height * sc)), Image.LANCZOS)
        ox = round((tx0 + tx1) / 2 - (sx0 + sx1) / 2 * sc); oy = round((ty0 + ty1) / 2 - (sy0 + sy1) / 2 * sc)
        pad = max(0, 20 - oy)  # tall hats and ears: grow the canvas upward so nothing is cut off
        img = Image.new('RGBA', (1024 + pad, 1024 + pad), (0, 0, 0, 0))
        img.paste(base, (pad // 2, pad), base)
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); layer.paste(acc, (ox + pad // 2, oy + pad), acc)
        img.alpha_composite(layer)
        img.resize((512, 512), Image.LANCZOS).save(f'assets/images/costume/level{lv}/{k}.png', optimize=True)
    print(lv, 'ok')
