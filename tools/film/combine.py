# Joins the logo opening (64 frames) and the walk-through (160 frames) into public/film/{land,port}/000-223.webp.
# The opening's last frames dissolve into the street. --fill copies the nearest frame into gaps (testing only).
import sys, os
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__))
APP = os.environ.get('FILM_OUT', os.path.join(S, '..', '..', 'public', 'film'))
fill = '--fill' in sys.argv
P, F = 64, 160
def smooth(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)
total = 0
for fmt in ('land', 'port'):
    os.makedirs(f'{APP}/{fmt}', exist_ok=True)
    pro = {i: f'{S}/out/p{fmt}/{fmt}_p{i:03d}.png' for i in range(P)}
    film = {i: f'{S}/out/{fmt}/{fmt}_{i:03d}.png' for i in range(F)}
    src = {}
    for i in range(P + F):
        path = pro[i] if i < P else film[i - P]
        if os.path.exists(path): src[i] = path
    have = sorted(src); made = 0
    f0 = Image.open(film[0]).convert('RGB') if os.path.exists(film[0]) else None
    for i in range(P + F):
        dst = f'{APP}/{fmt}/{i:03d}.webp'
        if i in src:
            im = Image.open(src[i]).convert('RGB')
            if i < P and i >= 56 and f0 is not None:
                im = Image.blend(im, f0, smooth((i - 55) / 9))
        elif fill and have:
            j = min(have, key=lambda k: abs(k - i)); im = Image.open(src[j]).convert('RGB')
        else:
            continue
        im.save(dst, 'WEBP', quality=78, method=6); made += 1; total += os.path.getsize(dst)
    print(fmt, 'rendered', len(src), 'of', P + F, 'written', made)
print('total', total // 1024, 'KB')
