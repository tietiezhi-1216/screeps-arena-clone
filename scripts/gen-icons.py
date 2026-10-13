#!/usr/bin/env python3
# 由 assets/icon-circle.png（透明底圆形红色 creep，系列图标）生成：
#   安卓启动图标（各密度 legacy 方形/圆形 + 自适应前景，背景纯色 #1C2533）、游戏内 logo、favicon、icon-512
# 与 screeps-blockly-mobile/scripts/gen-icons.py 同一套参数（自适应前景圆占 108dp 中的 64dp）
from PIL import Image, ImageDraw
import os
R = 'android-res'; BG = (28, 37, 51)
art = Image.open('assets/icon-circle.png').convert('RGBA')
def compose(size, frac, bg=None):
    im = Image.new('RGBA', (size, size), bg + (255,) if bg else (0, 0, 0, 0))
    d = round(size * frac); a = art.resize((d, d), Image.LANCZOS)
    im.alpha_composite(a, ((size - d) // 2, (size - d) // 2)); return im
def masked(im, shape):
    n = im.width; m = Image.new('L', (n * 4, n * 4), 0); dr = ImageDraw.Draw(m)
    (dr.ellipse if shape == 'round' else lambda b, fill: dr.rounded_rectangle(b, radius=n * 4 * 0.18, fill=fill))((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    im.putalpha(m.resize((n, n), Image.LANCZOS)); return im
for d, k in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
    p = f'{R}/mipmap-{d}'; os.makedirs(p, exist_ok=True); n = round(48 * k)
    masked(compose(n, 0.86, BG), 'square').save(f'{p}/ic_launcher.png')
    masked(compose(n, 0.92, BG), 'round').save(f'{p}/ic_launcher_round.png')
    compose(round(108 * k), 64 / 108).save(f'{p}/ic_launcher_foreground.png')
os.makedirs(f'{R}/mipmap-anydpi-v26', exist_ok=True); os.makedirs(f'{R}/values', exist_ok=True)
x = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
for nm in ['ic_launcher', 'ic_launcher_round']: open(f'{R}/mipmap-anydpi-v26/{nm}.xml', 'w').write(x)
open(f'{R}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1C2533</color>\n</resources>\n')
compose(512, 0.88, BG).save('assets/icon-512.png')
compose(256, 1.0).save('assets/logo.png')
compose(64, 1.0).save('assets/favicon.png')
print('ok')
