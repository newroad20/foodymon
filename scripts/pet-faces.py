# Reaction faces drawn over the stage images (face only, same body). Run from foodymon/:
#   uv run --with pillow --with numpy --with opencv-python-headless python faces.py assets/images assets/images/pet 3 4 5 6
import os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

# 1024px coordinates per stage: eye centres, eye cover radius, mouth cover box, mouth centre, line scale,
# add blush?, nose (x, y, r) to keep.
STAGES = {
    # Team art (2026-11): extras = sweat, brows and queasy squiggles, wiped so every mood face reads clean.
    1: dict(eyes=[(387, 473), (628, 468)], er=34, mouth=(464, 499, 549, 513), mc=(506, 506), s=1.15, blush=False,
            extras=[(674, 335, 723, 408), (720, 387, 759, 446)]),
    2: dict(eyes=[(362, 453), (613, 449)], er=36, mouth=(442, 458, 531, 504), mc=(487, 481), s=1.15, blush=False,
            extras=[(312, 366, 394, 418), (577, 366, 659, 418), (676, 336, 744, 410), (466, 570, 605, 734)]),
    3: dict(eyes=[(375, 428), (648, 428)], er=36, mouth=(452, 456, 574, 488), mc=(512, 472), s=1.25, blush=True),
    4: dict(eyes=[(402, 407), (702, 382)], er=62, mouth=(495, 432, 652, 535), mc=(570, 486), s=1.4, blush=False, nose=(570, 428, 16),
            eye_holes=[(402, 407, 80, 68), (705, 382, 74, 66)]),
    5: dict(eyes=[(422, 442), (682, 407)], er=62, mouth=(500, 452, 634, 560), mc=(565, 506), s=1.35, blush=False, nose=(567, 450, 14),
            eye_holes=[(420, 442, 78, 66), (684, 407, 72, 64)]),
    6: dict(eyes=[(445, 445), (692, 417)], er=60, mouth=(510, 462, 662, 570), mc=(585, 515), s=1.45, blush=False, nose=(585, 450, 15),
            eye_holes=[(445, 445, 72, 62), (692, 417, 66, 60)]),
}
INK, MOUTH, TONGUE, BLUSH = (45, 30, 50, 255), (70, 30, 45, 255), (240, 120, 140, 255), (255, 150, 160)
TEAR, HEART = (110, 175, 245, 235), (245, 85, 125, 255)

def heart(d, x, y, r):
    d.ellipse((x - r, y - r * 0.7, x, y + r * 0.3), fill=HEART)
    d.ellipse((x, y - r * 0.7, x + r, y + r * 0.3), fill=HEART)
    d.polygon([(x - r * 0.97, y - r * 0.1), (x + r * 0.97, y - r * 0.1), (x, y + r * 1.1)], fill=HEART)

def drop(d, x, y, r):
    d.polygon([(x, y - r * 1.8), (x - r * 0.85, y), (x + r * 0.85, y)], fill=TEAR)
    d.ellipse((x - r, y - r, x + r, y + r), fill=TEAR)

# Square around the head (1024px) for the face-only crops used by the mood picker.
FACE_BOX = {1: (228, 202, 788, 762), 2: (207, 180, 767, 740), 3: (232, 160, 792, 720), 4: (275, 150, 835, 710), 5: (275, 180, 835, 740), 6: (290, 190, 850, 750)}
MOODS = ['very_good', 'good', 'okay', 'tired', 'very_hard', 'unsure', 'no_answer']

def erase(img, ellipses):
    """Fill the given ellipses from the surrounding skin/fur (OpenCV inpainting)."""
    mask = Image.new('L', img.size, 0)
    for (x0, y0, x1, y1) in ellipses:
        gx, gy = (x1 - x0) * 0.12, (y1 - y0) * 0.12  # grown, so the eye's soft shadow goes too (no ghost ring)
        ImageDraw.Draw(mask).ellipse((x0 - gx, y0 - gy, x1 + gx, y1 + gy), fill=255)
    bgr = np.array(img.convert('RGB'))[:, :, ::-1].copy()
    a = np.array(img.getchannel('A'))
    # transparent pixels next to the hole are not skin: let inpainting fill them too instead of reading black
    unknown = np.array(mask) | ((a < 20).astype(np.uint8) * 255 & cv2.dilate(np.array(mask), np.ones((61, 61), np.uint8)))
    filled = cv2.inpaint(bgr, unknown, 25, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 7)  # smooth the inpainting streaks; skin/fur here is soft anyway
    out = Image.fromarray(filled[:, :, ::-1].copy()).convert('RGBA')
    out.putalpha(img.getchannel('A'))
    img.paste(out, (0, 0), mask.filter(ImageFilter.GaussianBlur(6)))

def make(base, cfg, kind):
    img = base.copy()
    (cx, cy), s, er = cfg['mc'], cfg['s'], cfg['er']
    P = lambda dx, dy: (cx + dx * s, cy + dy * s)
    B = lambda x0, y0, x1, y1: (cx + x0 * s, cy + y0 * s, cx + x1 * s, cy + y1 * s)
    W = lambda w: max(3, round(w * s))
    holes = []
    if 'extras' in cfg:  # wipe them with the eyes hidden too, so no eye ink bleeds in, then put the eyes back
        eyes = [(x - er * 1.1, y - er * 1.1, x + er * 1.1, y + er * 1.1) for (x, y) in cfg['eyes']]
        erase(img, cfg['extras'] + eyes)
        m = Image.new('L', img.size, 0)
        for e in eyes: ImageDraw.Draw(m).ellipse(e, fill=255)
        img.paste(base, (0, 0), m.filter(ImageFilter.GaussianBlur(3)))
    if True:
        x0, y0, x1, y1 = cfg['mouth']
        holes.append((x0 - 9, y0 - 9, x1 + 9, y1 + 9))
        if 'nose' in cfg:  # erase with the mouth so its pink can't bleed down, then put it back
            nx, ny, nr = cfg['nose']; holes.append((nx - nr - 8, ny - nr - 8, nx + nr + 8, ny + nr + 8))
    if kind in ('eat_yum', 'sleep', 'very_good', 'good', 'tired', 'very_hard'):
        # eye_holes (x, y, rx, ry) cover big anime eyes with their lashes; plain dot eyes use er
        holes += [(x - rx, y - ry, x + rx, y + ry) for (x, y, rx, ry) in cfg.get('eye_holes', [])] or [
            (x - er, y - er, x + er, y + er) for (x, y) in cfg['eyes']]
    if holes:
        erase(img, holes)
        if 'nose' in cfg:
            nx, ny, nr = cfg['nose']
            m = Image.new('L', img.size, 0); ImageDraw.Draw(m).ellipse((nx - nr, ny - nr, nx + nr, ny + nr), fill=255)
            img.paste(base, (0, 0), m.filter(ImageFilter.GaussianBlur(2)))
    if (cfg['blush'] and kind in ('eat_chew', 'eat_yum')) or kind in ('very_good', 'good'):
        layer = Image.new('RGBA', img.size, BLUSH + (0,)); m = Image.new('L', img.size, 0)
        for (x, y) in cfg['eyes']:
            bx = x - 50 if x < cx else x + 50
            ImageDraw.Draw(m).ellipse((bx - 40, y + 50, bx + 40, y + 88), fill=120)
        layer.putalpha(m.filter(ImageFilter.GaussianBlur(9))); img.alpha_composite(layer)
    ink = Image.new('RGBA', img.size, (0, 0, 0, 0))  # features go on their own layer, then get the clay look
    d = ImageDraw.Draw(ink)
    def open_smile(hw, h):  # D-shaped open mouth: flat top, round bottom, dark inside
        d.chord(B(-hw, -h * 0.3, hw, h * 1.3), 0, 180, fill=(40, 70, 60, 70), outline=INK, width=W(9))
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
    # Mood faces: drawn big and plain, like phone emoji, so the feeling reads even in a small circle.
    # Mood faces follow the team's reference (2026-11): thick rounded clay lines, the same on every stage.
    elif kind == 'very_good':  # >< eyes, big open laugh
        (lx, ly), (rx, ry) = cfg['eyes']
        r = er * 0.95
        d.line([(lx - r, ly - r * 0.6), (lx + r * 0.6, ly), (lx - r, ly + r * 0.6)], fill=INK, width=W(11), joint='curve')
        d.line([(rx + r, ry - r * 0.6), (rx - r * 0.6, ry), (rx + r, ry + r * 0.6)], fill=INK, width=W(11), joint='curve')
        open_smile(52, 64)
    elif kind == 'good':  # ^^ eyes, open smile
        for (x, y) in cfg['eyes']:
            r = er * 0.95; d.arc((x - r, y - r * 0.5, x + r, y + r * 1.3), 200, 340, fill=INK, width=W(11))
        open_smile(44, 52)
    elif kind == 'okay':  # the everyday soft smile
        d.arc(B(-42, -34, 42, 22), 25, 155, fill=INK, width=W(10))
    elif kind == 'tired':  # 😩 heavy lids, frown, sweat drop
        for (x, y) in cfg['eyes']:
            r = er * 0.55; d.chord((x - r, y - r * 0.3, x + r, y + r), 0, 180, fill=INK)
            d.line([(x - r * 1.1, y - r * 0.5), (x + r * 1.1, y - r * 0.5)], fill=INK, width=W(7))
        d.arc(B(-30, 6, 30, 46), 200, 340, fill=INK, width=W(9))
        (rx, ry) = cfg['eyes'][1]
        drop(d, rx + er * 1.3, ry - er * 1.2, 15 * s)
    elif kind == 'very_hard':  # 😭 squeezed eyes, streaming tears, open cry
        (lx, ly), (rx, ry) = cfg['eyes']
        r = er * 0.6
        d.line([(lx - r, ly - r * 0.6), (lx + r * 0.6, ly), (lx - r, ly + r * 0.6)], fill=INK, width=W(10), joint='curve')
        d.line([(rx + r, ry - r * 0.6), (rx - r * 0.6, ry), (rx + r, ry + r * 0.6)], fill=INK, width=W(10), joint='curve')
        for (x, y) in cfg['eyes']:
            d.rounded_rectangle((x - 13 * s, y + r * 0.7, x + 13 * s, y + r * 0.7 + 120 * s), radius=13 * s, fill=TEAR)
        d.chord(B(-36, 0, 36, 70), 180, 360, fill=MOUTH)
    elif kind == 'unsure':  # 🤨 one brow up, slanted mouth
        (rx, ry) = cfg['eyes'][1]
        d.line([(rx - er * 0.8, ry - er * 1.25), (rx + er * 0.9, ry - er * 1.55)], fill=INK, width=W(9))
        d.line([P(-30, 12), P(-10, 4), P(10, 10), P(30, -6)], fill=INK, width=W(8), joint='curve')
    elif kind == 'no_answer':  # 🤐 zipped mouth
        d.line([P(-38, 4), P(38, 4)], fill=INK, width=W(8))
        for dx in range(-32, 36, 10): d.line([P(dx, -6), P(dx, 14)], fill=INK, width=W(4))
        d.rounded_rectangle(B(36, -2, 54, 26), radius=4 * s, fill=(170, 170, 185, 255), outline=INK, width=W(3))
    clay(img, ink)
    return img

def clay(img, ink):
    """Composite the drawn features with a soft shadow below and a shine on top, like moulded clay."""
    a = ink.getchannel('A')
    shadow = Image.new('RGBA', img.size, (20, 40, 35, 0))
    shadow.putalpha(a.point(lambda v: v * 0.35).filter(ImageFilter.GaussianBlur(3)).transform(
        img.size, Image.AFFINE, (1, 0, -2, 0, 1, -4)))
    img.alpha_composite(shadow)
    img.alpha_composite(ink)
    inner = a.filter(ImageFilter.MinFilter(7))
    shine = Image.new('RGBA', img.size, (255, 255, 255, 0))
    shine.putalpha(Image.fromarray((np.array(inner, float) * 0.22 * (np.array(
        inner.transform(img.size, Image.AFFINE, (1, 0, 3, 0, 1, 3))) == 0)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)))
    img.alpha_composite(shine)

KINDS = ['eat_open', 'eat_chew', 'eat_yum', 'sleep', 'very_good', 'good', 'tired', 'very_hard', 'okay', 'unsure', 'no_answer']
images, outroot = sys.argv[1], sys.argv[2]
for lv in map(int, sys.argv[3:]):
    base = Image.open(os.path.join(images, f'level{lv}.png')).convert('RGBA')
    out = os.path.join(outroot, f'level{lv}'); os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(out, 'face'), exist_ok=True)
    for k in KINDS:
        img = make(base, STAGES[lv], k)
        img.resize((512, 512), Image.LANCZOS).save(os.path.join(out, f'{k}.png'), optimize=True)
        if k in MOODS:
            img.crop(FACE_BOX[lv]).resize((256, 256), Image.LANCZOS).save(os.path.join(out, 'face', f'{k}.png'), optimize=True)
print('ok')
