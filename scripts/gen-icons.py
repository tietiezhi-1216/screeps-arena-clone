#!/usr/bin/env python3
# 由原创图标生成 Android 启动图标（传统 + 圆形 + 自适应前景），输出到 android-res/
from PIL import Image, ImageDraw
import os
S = 4
def art(size, bg=True, scale=1.0):
    N = size * S; im = Image.new('RGBA', (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    k = lambda v: int((256 + (v - 256) * scale) * N / 512)
    w = lambda v: max(1, int(v * scale * N / 512))
    if bg: d.rounded_rectangle([0, 0, N - 1, N - 1], radius=w(96), fill='#1b1d22')
    d.ellipse([k(66), k(66), k(446), k(446)], fill='#23262d', outline='#ffd34e', width=w(22))
    for cx, col in [(176, '#5ec8ff'), (336, '#ff6f6f')]:
        for i in range(4):
            a0 = -90 + i * 90 + 5; d.arc([k(cx - 58), k(198), k(cx + 58), k(314)], a0, a0 + 80, fill=col, width=w(16))
        d.ellipse([k(cx - 36), k(220), k(cx + 36), k(292)], fill=col)
    d.line([k(236), k(228), k(276), k(284)], fill='#ffd34e', width=w(14)); d.line([k(276), k(228), k(236), k(284)], fill='#ffd34e', width=w(14))
    return im.resize((size, size), Image.LANCZOS)
def circle(im):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).ellipse([0, 0, im.size[0] - 1, im.size[1] - 1], fill=255)
    bg = Image.new('RGBA', im.size, '#1b1d22'); bg.alpha_composite(art(im.size[0], False, 1.15)); bg.putalpha(m); return bg
out = 'android-res'
for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    dd = f'{out}/mipmap-{name}'; os.makedirs(dd, exist_ok=True)
    art(px).save(f'{dd}/ic_launcher.png'); circle(art(px)).save(f'{dd}/ic_launcher_round.png')
    art(int(px * 2.25), False, 0.62).save(f'{dd}/ic_launcher_foreground.png')
os.makedirs(f'{out}/mipmap-anydpi-v26', exist_ok=True); os.makedirs(f'{out}/values', exist_ok=True)
x = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
for n in ['ic_launcher', 'ic_launcher_round']: open(f'{out}/mipmap-anydpi-v26/{n}.xml', 'w').write(x)
open(f'{out}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1B1D22</color>\n</resources>\n')
