# Finishing pass for the rendered frames: a soft bloom on the lights, a gentle vignette, fine grain; then WebP.
#   python3 post.py SRC_DIR OUT_DIR [--quality 78] [--blend]
# Reads SRC_DIR/{land,port}_NNN.png and writes OUT_DIR/{land,port}/NNN.webp (OUT_DIR is the app's public/film).
# --blend fills a frame that is not rendered yet with the mix of its two rendered neighbours (the player shows the
# same mix between frames anyway), so the film can go out before the last in-between frames are done.
import sys, os, argparse
import numpy as np
from PIL import Image, ImageFilter
ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--quality', type=int, default=78); ap.add_argument('--blend', action='store_true')
A = ap.parse_args()
N = 192

def finish(a, seed):
    """a: float RGB 0-1."""
    h, w, _ = a.shape
    lum = a.max(axis=2, keepdims=True)
    hi = a * np.clip((lum - 0.72) / 0.28, 0, 1)                          # only what is already bright blooms
    small = Image.fromarray((hi * 255).astype(np.uint8)).resize((w // 4, h // 4), Image.BILINEAR)
    glow = np.zeros_like(a)
    for r, g in ((3, 0.30), (9, 0.22)):
        b = small.filter(ImageFilter.GaussianBlur(r)).resize((w, h), Image.BICUBIC)
        glow += np.asarray(b, dtype=np.float32) / 255.0 * g
    a = 1 - (1 - a) * (1 - np.clip(glow, 0, 1))                          # screen
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / 1.414
    a = a * (1 - 0.30 * np.clip((d - 0.35) / 0.65, 0, 1) ** 2)[..., None]
    a = a + np.random.default_rng(seed).normal(0, 0.006, (h, w, 1)).astype(np.float32)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))

def load(path):
    try:
        im = Image.open(path); im.load()
        return np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
    except Exception as e:
        print('unreadable, render it again:', path, e); return None

for fmt in ('land', 'port'):
    src = {}
    for i in range(N):
        p = f'{A.src}/{fmt}_{i:03d}.png'
        if os.path.exists(p): src[i] = p
    if not src: print(fmt, 'no frames'); continue
    os.makedirs(f'{A.out}/{fmt}', exist_ok=True)
    have = sorted(src); cache = {}; made = blended = total = 0
    def get(i):
        if i not in cache:
            if len(cache) > 6: cache.pop(next(iter(cache)))
            cache[i] = load(src[i])
        return cache[i]
    for i in range(N):
        if i in src: a = get(i)
        elif A.blend:
            lo = max((k for k in have if k < i), default=None); hi = min((k for k in have if k > i), default=None)
            if lo is None or hi is None: a = get(lo if hi is None else hi)
            else:
                t = (i - lo) / (hi - lo); x, y = get(lo), get(hi)
                a = None if x is None or y is None else x * (1 - t) + y * t
            blended += 1
        else: continue
        if a is None: continue
        dst = f'{A.out}/{fmt}/{i:03d}.webp'
        finish(a, i).save(dst, 'WEBP', quality=A.quality, method=6); made += 1; total += os.path.getsize(dst)
    print(f'{fmt}: {len(src)} rendered, {blended} blended, {made} written, {total // 1024} KB')
