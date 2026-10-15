import base64,sys,os
R='/home/user/teambuilding/src/'
b=lambda p:base64.b64encode(open(R+p,'rb').read()).decode()
common=open('common.css').read().replace('__OUTFIT_LATIN__',b('fonts/outfit-latin.woff2')).replace('__OUTFIT_EXT__',b('fonts/outfit-latin-ext.woff2')).replace('__LOGO__',b('img/logo-crop.jpg'))
for n in 'ab':
    open(f'out_{n}.html','w').write(open(f'{n}.html').read().replace('__COMMON__',common))
