# Builds the self-contained deck from deck.tpl.html: embeds fonts, logo and flowchart as base64.
# Usage: python3 src/build.py   (writes Fonte_Viva_kockazati_workshop.html and deploy/index.html)
import base64, os
S = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(S)
b = lambda p: base64.b64encode(open(os.path.join(S, p), 'rb').read()).decode()
t = open(os.path.join(S, 'deck.tpl.html')).read()
for k, v in {'__OUTFIT_LATIN__': 'fonts/outfit-latin.woff2', '__OUTFIT_EXT__': 'fonts/outfit-latin-ext.woff2',
             '__LOGO__': 'img/logo-crop.jpg', '__MAP__': 'img/53baadf8.png', '__WALKMAP__': 'img/walk-beszerzes.png'}.items():
    assert k in t, k
    t = t.replace(k, b(v))
for out in ['Fonte_Viva_kockazati_workshop.html', 'deploy/index.html']:
    open(os.path.join(R, out), 'w').write(t)
print(len(t), 'bytes')
