#!/usr/bin/env python3
# 由 www/icon.svg（系列图标，Arena 红）生成 Android 启动图标：传统 + 圆形 + 自适应前景/背景
import cairosvg, io, os, re
from PIL import Image, ImageDraw
SVG = open('assets/icon.svg').read()
FG = re.sub(r'<rect width="1024" height="1024" fill="#1c2533"/>', '', SVG)
def png(svg, px): return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(), output_width=px, output_height=px))).convert('RGBA')
def rounded(im, r):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], radius=r, fill=255); im.putalpha(m); return im
out = 'android-res'
for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = f'{out}/mipmap-{name}'; os.makedirs(d, exist_ok=True)
    rounded(png(SVG, px), px // 5).save(f'{d}/ic_launcher.png')
    c = png(SVG, px); m = Image.new('L', c.size, 0); ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255); c.putalpha(m); c.save(f'{d}/ic_launcher_round.png')
    f = int(px * 2.25); fg = Image.new('RGBA', (f, f), (0, 0, 0, 0)); a = png(FG, int(f * 0.72)); fg.alpha_composite(a, ((f - a.width) // 2,) * 2); fg.save(f'{d}/ic_launcher_foreground.png')
os.makedirs(f'{out}/mipmap-anydpi-v26', exist_ok=True); os.makedirs(f'{out}/values', exist_ok=True)
x = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n'
for n in ['ic_launcher', 'ic_launcher_round']: open(f'{out}/mipmap-anydpi-v26/{n}.xml', 'w').write(x)
open(f'{out}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1C2533</color>\n</resources>\n')
png(SVG, 512).save('assets/icon-512.png')
