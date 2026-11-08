# PNG frames -> WebP in the app's public/film/{land,port}/NNN.webp. --fill copies the nearest rendered frame into
# gaps (for testing the player while the render runs); the final run has every frame.
import sys, os, glob, shutil
from PIL import Image
S = os.path.dirname(os.path.abspath(__file__)); APP = os.environ.get('FILM_OUT', os.path.join(S, '..', '..', 'public', 'film'))
fill = '--fill' in sys.argv; N = 160; total = 0
for fmt in ('land', 'port'):
    os.makedirs(f'{APP}/{fmt}', exist_ok=True)
    have = {int(os.path.basename(p)[5:8]): p for p in glob.glob(f'{S}/out/{fmt}/{fmt}_*.png')}
    for i in range(N):
        dst = f'{APP}/{fmt}/{i:03d}.webp'
        if i in have:
            if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(have[i]) or os.path.getsize(dst) == 0 or os.path.islink(dst):
                if os.path.islink(dst): os.remove(dst)
                Image.open(have[i]).convert('RGB').save(dst, 'WEBP', quality=78, method=6)
        elif fill and have:
            j = min(have, key=lambda k: abs(k - i))
            src = f'{APP}/{fmt}/{j:03d}.webp'
            if not os.path.exists(src): Image.open(have[j]).convert('RGB').save(src, 'WEBP', quality=78, method=6)
            shutil.copyfile(src, dst + '.tmp'); os.replace(dst + '.tmp', dst)
        if os.path.exists(dst): total += os.path.getsize(dst)
    print(fmt, len(have), 'rendered')
print('total', total // 1024, 'KB')
