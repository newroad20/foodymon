import sys, numpy as np, cv2
from PIL import Image

# Remove the 꽃장식 flower: largest pink blob in the upper-left, filled (convex hull covers the yellow
# stamens and leaves), grown a little, then inpainted from the surrounding body; alpha is inpainted too
# so petals sticking out past the head become transparent.
src, out = sys.argv[1], sys.argv[2]
GROW = {1: 14, 2: 14, 3: 14, 4: 12, 5: 8, 6: 8}
for lv in range(1, 7):
    im = np.array(Image.open(f'{src}/푸디몬_{lv}단계_의상_6종_1024규격/level{lv}_꽃장식.png').convert('RGBA'))
    rgb, a = im[:, :, :3].copy(), im[:, :, 3].copy()
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    pink = (((h >= 150) | (h <= 8)) & (s > 40) & (v > 150) & (a > 100)).astype(np.uint8)
    pink[420:, :] = 0  # flower is on the head, cheeks and belly are below
    pink[:, 520:] = 0  # always on the left side of the head
    n, lab, st, _ = cv2.connectedComponentsWithStats(pink, 8)
    k = 1 + int(np.argmax(st[1:, 4]))
    pts = np.column_stack(np.where(lab == k))[:, ::-1].astype(np.int32)
    m = np.zeros(a.shape, np.uint8)
    cv2.fillConvexPoly(m, cv2.convexHull(pts), 255)
    m = cv2.dilate(m, np.ones((GROW[lv] * 2 + 1,) * 2, np.uint8))
    bgr = rgb[:, :, ::-1].copy()
    ring = cv2.dilate(m, np.ones((61, 61), np.uint8))
    unknown = m | (((a < 20).astype(np.uint8) * 255) & ring)
    bgr2 = cv2.inpaint(bgr, unknown, 21, cv2.INPAINT_TELEA)
    a2 = cv2.inpaint(a, m, 21, cv2.INPAINT_TELEA)
    soft = cv2.GaussianBlur(m, (0, 0), 3) / 255.0
    bgr_out = (bgr2 * soft[..., None] + bgr * (1 - soft[..., None])).astype(np.uint8)
    a_out = (a2 * soft + a * (1 - soft)).astype(np.uint8)
    Image.fromarray(np.dstack([bgr_out[:, :, ::-1], a_out]), 'RGBA').save(f'{out}/level{lv}.png', optimize=True)
    cv2.imwrite(f'{out}/mask{lv}.png', m)
print('ok')
