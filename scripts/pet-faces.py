# Reaction faces drawn over the stage images (face only, same body). Run from foodymon/:
#   uv run --with pillow --with numpy --with opencv-python-headless python faces.py assets/images assets/images/pet 3 4 5 6
import os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

# 1024px coordinates per stage: eye centres, eye cover radius, mouth cover box, mouth centre, line scale,
# add blush?, nose (x, y, r) to keep.
STAGES = {
    3: dict(eyes=[(375, 428), (648, 428)], er=36, mouth=(452, 456, 574, 488), mc=(512, 472), s=1.25, blush=True),
    4: dict(eyes=[(402, 407), (702, 382)], er=62, mouth=(495, 432, 652, 535), mc=(570, 486), s=1.4, blush=False, nose=(570, 428, 16),
            eye_holes=[(402, 407, 80, 68), (705, 382, 74, 66)]),
    5: dict(eyes=[(422, 442), (682, 407)], er=62, mouth=(500, 452, 634, 560), mc=(565, 506), s=1.35, blush=False, nose=(567, 450, 14),
            eye_holes=[(420, 442, 78, 66), (684, 407, 72, 64)]),
    6: dict(eyes=[(445, 445), (692, 417)], er=60, mouth=(510, 462, 662, 570), mc=(585, 515), s=1.45, blush=False, nose=(585, 450, 15),
            eye_holes=[(445, 445, 72, 62), (692, 417, 66, 60)]),
}
INK, MOUTH, TONGUE, BLUSH = (45, 30, 50, 255), (70, 30, 45, 255), (240, 120, 140, 255), (255, 150, 160)

def erase(img, ellipses):
    """Fill the given ellipses from the surrounding skin/fur (OpenCV inpainting)."""
    mask = Image.new('L', img.size, 0)
    for box in ellipses:
        ImageDraw.Draw(mask).ellipse(box, fill=255)
    bgr = np.array(img.convert('RGB'))[:, :, ::-1].copy()
    filled = cv2.inpaint(bgr, np.array(mask), 25, cv2.INPAINT_TELEA)
    out = Image.fromarray(filled[:, :, ::-1].copy()).convert('RGBA')
    out.putalpha(img.getchannel('A'))
    img.paste(out, (0, 0), mask.filter(ImageFilter.GaussianBlur(3)))

def make(base, cfg, kind):
    img = base.copy()
    (cx, cy), s, er = cfg['mc'], cfg['s'], cfg['er']
    P = lambda dx, dy: (cx + dx * s, cy + dy * s)
    B = lambda x0, y0, x1, y1: (cx + x0 * s, cy + y0 * s, cx + x1 * s, cy + y1 * s)
    W = lambda w: max(3, round(w * s))
    holes = []
    if kind != 'okay':
        x0, y0, x1, y1 = cfg['mouth']
        holes.append((x0 - 9, y0 - 9, x1 + 9, y1 + 9))
        if 'nose' in cfg:  # erase with the mouth so its pink can't bleed down, then put it back
            nx, ny, nr = cfg['nose']; holes.append((nx - nr - 8, ny - nr - 8, nx + nr + 8, ny + nr + 8))
    if kind in ('eat_yum', 'sleep', 'very_good', 'tired'):
        # eye_holes (x, y, rx, ry) cover big anime eyes with their lashes; plain dot eyes use er
        holes += [(x - rx, y - ry, x + rx, y + ry) for (x, y, rx, ry) in cfg.get('eye_holes', [])] or [
            (x - er, y - er, x + er, y + er) for (x, y) in cfg['eyes']]
    if holes:
        erase(img, holes)
        if 'nose' in cfg and kind != 'okay':
            nx, ny, nr = cfg['nose']
            m = Image.new('L', img.size, 0); ImageDraw.Draw(m).ellipse((nx - nr, ny - nr, nx + nr, ny + nr), fill=255)
            img.paste(base, (0, 0), m.filter(ImageFilter.GaussianBlur(2)))
    if cfg['blush'] and kind in ('eat_chew', 'eat_yum', 'very_good', 'good'):
        layer = Image.new('RGBA', img.size, BLUSH + (0,)); m = Image.new('L', img.size, 0)
        for (x, y) in cfg['eyes']:
            bx = x - 50 if x < cx else x + 50
            ImageDraw.Draw(m).ellipse((bx - 40, y + 50, bx + 40, y + 88), fill=120)
        layer.putalpha(m.filter(ImageFilter.GaussianBlur(9))); img.alpha_composite(layer)
    d = ImageDraw.Draw(img)
    def happy_eyes():
        for (x, y) in cfg['eyes']:
            r = er * 0.55; d.arc((x - r, y - r * 0.5, x + r, y + r), 200, 340, fill=INK, width=W(8))
    def closed_eyes():
        for (x, y) in cfg['eyes']:
            r = er * 0.55; d.arc((x - r, y - r, x + r, y + r * 0.5), 20, 160, fill=INK, width=W(8))
    if kind == 'eat_open':
        d.ellipse(B(-41, -13, 41, 63), fill=MOUTH); d.ellipse(B(-23, 31, 23, 63), fill=TONGUE)
    elif kind == 'eat_chew':
        d.line([P(-31, 3), P(-15, -7), P(0, 3), P(15, -7), P(31, 3)], fill=INK, width=W(7), joint='curve')
    elif kind == 'eat_yum':
        happy_eyes(); d.arc(B(-35, -29, 35, 27), 20, 160, fill=INK, width=W(7))
    elif kind == 'sleep':
        closed_eyes(); d.ellipse(B(-11, 1, 11, 23), outline=INK, width=W(6))
    elif kind == 'very_good':
        happy_eyes(); d.chord(B(-37, -23, 39, 47), 0, 180, fill=MOUTH); d.chord(B(-17, 19, 19, 47), 0, 180, fill=TONGUE)
    elif kind == 'good':
        d.arc(B(-35, -29, 35, 27), 20, 160, fill=INK, width=W(7))
    elif kind == 'tired':
        for (x, y) in cfg['eyes']:
            r = er * 0.5; d.chord((x - r, y - r * 0.4, x + r, y + r), 0, 180, fill=INK)
        d.line([P(-27, 3), P(27, 3)], fill=INK, width=W(7))
    elif kind == 'very_hard':
        (lx, ly), (rx, ry) = cfg['eyes']
        d.line([(lx - er * 0.6, ly - er * 0.95), (lx + er * 0.45, ly - er * 1.2)], fill=INK, width=W(7))
        d.line([(rx - er * 0.45, ry - er * 1.2), (rx + er * 0.6, ry - er * 0.95)], fill=INK, width=W(7))
        d.arc(B(-33, 1, 33, 49), 200, 340, fill=INK, width=W(7))
        d.ellipse((lx + er * 0.2, ly + er * 1.0, lx + er * 0.2 + 16 * s, ly + er * 1.0 + 28 * s), fill=(120, 180, 240, 255))
    elif kind == 'unsure':
        (rx, ry) = cfg['eyes'][1]
        d.line([(rx - er * 0.8, ry - er * 1.25), (rx + er * 0.9, ry - er * 1.45)], fill=INK, width=W(7))
        d.line([P(-29, 7), P(-15, -1), P(0, 7), P(15, -1), P(29, 7)], fill=INK, width=W(6), joint='curve')
    elif kind == 'no_answer':
        d.line([P(-29, 1), P(29, 1)], fill=INK, width=W(7))
        for dx in range(-21, 27, 12): d.line([P(dx, -7), P(dx, 9)], fill=INK, width=W(4))
    return img.resize((512, 512), Image.LANCZOS)

KINDS = ['eat_open', 'eat_chew', 'eat_yum', 'sleep', 'very_good', 'good', 'tired', 'very_hard', 'unsure', 'no_answer']
images, outroot = sys.argv[1], sys.argv[2]
for lv in map(int, sys.argv[3:]):
    base = Image.open(os.path.join(images, f'level{lv}.png')).convert('RGBA')
    out = os.path.join(outroot, f'level{lv}'); os.makedirs(out, exist_ok=True)
    for k in KINDS:
        make(base, STAGES[lv], k).save(os.path.join(out, f'{k}.png'), optimize=True)
print('ok')
