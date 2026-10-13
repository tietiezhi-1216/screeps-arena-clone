#!/usr/bin/env python3
# 由 assets/icon-circle.png（透明底，官方 Steam 图标红蓝 <·> 的矢量重绘，源 assets/icon-art.svg）生成：
#   安卓启动图标（各密度 legacy 方形/圆形 + 自适应前景，背景纯色 #1D2027）、游戏内 logo、favicon、icon-512
# 与 screeps-blockly-mobile/scripts/gen-icons.py 同一套参数（自适应前景圆占 108dp 中的 64dp）
from PIL import Image, ImageDraw
import os
R = 'android-res'; BG = (29, 32, 39)
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
    compose(round(108 * k), 60 / 108).save(f'{p}/ic_launcher_foreground.png')
os.makedirs(f'{R}/mipmap-anydpi-v26', exist_ok=True); os.makedirs(f'{R}/values', exist_ok=True)
x = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
for nm in ['ic_launcher', 'ic_launcher_round']: open(f'{R}/mipmap-anydpi-v26/{nm}.xml', 'w').write(x)
open(f'{R}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1D2027</color>\n</resources>\n')
compose(512, 0.88, BG).save('assets/icon-512.png')
compose(256, 0.8, BG).save('assets/logo.png')
compose(64, 1.0).save('assets/favicon.png')
print('ok')
# 启动画面（覆盖 Capacitor 默认 splash）：纯底色 + 居中图标
SPL = {'drawable': (480, 320)}
for o, (a, b) in {'land': (1, 0), 'port': (0, 1)}.items():
    for d, (w, h) in {'mdpi': (480, 320), 'hdpi': (800, 480), 'xhdpi': (1280, 720), 'xxhdpi': (1600, 960), 'xxxhdpi': (1920, 1280)}.items():
        SPL[f'drawable-{o}-{d}'] = (w, h) if o == 'land' else (h, w)
for dn, (w, h) in SPL.items():
    os.makedirs(f'{R}/{dn}', exist_ok=True); im = Image.new('RGBA', (w, h), BG + (255,))
    s = round(min(w, h) * 0.3); a = art.resize((s, s), Image.LANCZOS); im.alpha_composite(a, ((w - s) // 2, (h - s) // 2))
    im.convert('RGB').save(f'{R}/{dn}/splash.png')
print('splash ok')
