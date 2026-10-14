# Builds the street-poster Basha logo: wavy 3D wordmark on a wrinkled poster background.
# Run from brand/street after rendering the layers (see README in commit): python3 make_street.py
import numpy as np
from PIL import Image, ImageFilter
rng = np.random.default_rng(11)
RED = np.array([232, 64, 42], float)

def warp(img, amp=34, wavelen=820, bulge=.2, arch=46):
    a = np.asarray(img).astype(float); H, W = a.shape[:2]
    pad = 160; out = np.zeros((H + 2 * pad, W, 4))
    ys, xs = np.mgrid[0:H + 2 * pad, 0:W].astype(float)
    cx, cy = W / 2, H / 2 + pad
    t = (xs - cx) / (W / 2)
    scale = 1 + bulge * (1 - t ** 2)
    off = amp * np.sin(2 * np.pi * xs / wavelen + .6) - arch * (1 - t ** 2)
    sy = (ys - cy - off) / scale + H / 2
    y0 = np.floor(sy).astype(int); fy = sy - y0
    valid = (y0 >= 0) & (y0 < H - 1)
    y0c = np.clip(y0, 0, H - 2); x = xs.astype(int)
    v = a[y0c, x] * (1 - fy[..., None]) + a[y0c + 1, x] * fy[..., None]
    v[~valid] = 0
    return Image.fromarray(v.astype(np.uint8), 'RGBA').crop(Image.fromarray(v.astype(np.uint8), 'RGBA').getbbox())

def poster(w, h, base=RED):
    def field(scale, blur):
        n = Image.fromarray((rng.random((h // scale + 2, w // scale + 2)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        return np.asarray(n.filter(ImageFilter.GaussianBlur(blur))).astype(float) / 255
    hgt = field(180, 50) * .7 + field(90, 28) * .25
    # long crease lines
    cre = np.zeros((h, w))
    for _ in range(5):
        x0, y0 = rng.integers(0, w), rng.integers(0, h); ang = rng.uniform(0, np.pi)
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.abs((xx - x0) * np.sin(ang) - (yy - y0) * np.cos(ang))
        cre += np.exp(-(d / rng.uniform(10, 26)) ** 2) * rng.uniform(.3, .7)
    hgt += np.asarray(Image.fromarray((cre * 255 / max(cre.max(), 1)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(float) / 255 * .12
    gy, gx = np.gradient(hgt)
    shade = np.clip((-gx * 0.7 - gy * 0.7) * 60, -.07, .08)
    img = base[None, None, :] * (1 + shade[..., None])
    img += (rng.random((h, w, 1)) - .5) * 14          # paper grain
    vign = 1 - .12 * (((np.mgrid[0:h, 0:w][1] - w / 2) / w) ** 2 + ((np.mgrid[0:h, 0:w][0] - h / 2) / h) ** 2) * 4
    img *= vign[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').convert('RGBA'), shade

def lay(canvas, part, cx, cy, width):
    p = Image.open(part) if isinstance(part, str) else part
    r = width / p.width; p = p.resize((int(p.width * r), int(p.height * r)), Image.LANCZOS)
    canvas.alpha_composite(p, (int(cx - p.width / 2), int(cy - p.height / 2)))

def paper_over(canvas, shade):
    # let the wrinkles show through everything, like a printed poster
    a = np.asarray(canvas).astype(float)
    a[..., :3] *= (1 + shade * .8)[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

word = warp(Image.open('word-flat.png'))
word.save('word-wavy.png')

# 1) square logo / profile picture
bg, sh = poster(1080, 1080)
lay(bg, word, 530, 520, 900)
lay(bg, 'part-sticker.png', 860, 345, 270)
lay(bg, 'part-tagline.png', 540, 720, 640)
paper_over(bg, sh).convert('RGB').save('basha-street-logo.png')

# 2) street poster with stickers
bg, sh = poster(1200, 1500)
lay(bg, word, 590, 690, 1000)
lay(bg, 'part-sticker.png', 960, 500, 300)
lay(bg, 'part-tagline.png', 600, 920, 700)
lay(bg, 'part-s1.png', 1060, 230, 470)
lay(bg, 'part-s2.png', 230, 1250, 400)
lay(bg, 'part-s3.png', 1040, 1270, 280)
paper_over(bg, sh).convert('RGB').save('basha-street-poster.png')
print('ok')
