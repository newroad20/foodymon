# Turn the team's stage art (white background) into level{N}.png: background cut out, 1024px canvas,
# standing on the same floor line as level3.png. Run from foodymon/:
#   uv run --with pillow --with numpy --with opencv-python-headless python scripts/pet-base-from-art.py ../1단계_새그림.png 1 680
import sys, numpy as np, cv2
from PIL import Image

src, lv, height = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
rgb = np.array(Image.open(src).convert('RGB'))
h, w = rgb.shape[:2]
# Background = near-white pixels connected to the border (white inside the art, like eye shine, stays).
white = (rgb.min(axis=2) > 232).astype(np.uint8)
n, lab = cv2.connectedComponents(white, connectivity=4)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border)) & (white > 0)
alpha = np.where(bg, 0, 255).astype(np.uint8)
alpha = cv2.GaussianBlur(cv2.erode(alpha, np.ones((3, 3), np.uint8)), (0, 0), 1.2)
img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
img = img.crop(img.getbbox())
scale = height / img.height
img = img.resize((round(img.width * scale), height), Image.LANCZOS)
canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
FLOOR = 929  # level3.png's feet
canvas.paste(img, ((1024 - img.width) // 2, FLOOR - height), img)
canvas.save(f'assets/images/level{lv}.png', optimize=True)
print(lv, canvas.getbbox())
