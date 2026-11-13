#!/bin/bash
# Сборка motion-ролика: приложение должно работать на http://localhost:8137/ (например, node serve.mjs mise).
# Если есть promo/voice/voice.wav (после node promo/voice.mjs), сцены подгоняются под озвучку и голос добавляется в ролик.
set -e
cd "$(dirname "$0")/.."
node promo/make-motion.cjs
python3 - <<'PY'
import json
f=json.load(open('promo/.frames.json')); out=['ffconcat version 1.0']
for i,(p,t) in enumerate(f):
    d=(f[i+1][1]-t) if i+1<len(f) else 0.05
    out.append(f"file '{p.split('/',1)[1]}'\nduration {max(d,0.005):.4f}")
open('promo/.frames.txt','w').write('\n'.join(out)); print('длина', round(f[-1][1]-f[0][1],1))
PY
LEN=$(python3 -c "import json;f=json.load(open('promo/.frames.json'));print(round(f[-1][1]-f[0][1],2))")
python3 promo/music.py "$LEN" promo/.music.wav
if [ -f promo/voice/voice.wav ]; then
  ffmpeg -y -loglevel error -f concat -safe 0 -i promo/.frames.txt -i promo/voice/voice.wav -i promo/.music.wav -filter_complex "[1:a]adelay=600|600,volume=1.4[v];[2:a]volume=0.22[m];[v][m]amix=inputs=2:duration=longest:normalize=0[a]" -map 0:v -map "[a]" -vf "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 160k -shortest -movflags +faststart promo/mise-motion.mp4
else
  ffmpeg -y -loglevel error -f concat -safe 0 -i promo/.frames.txt -i promo/.music.wav -vf "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 160k -shortest -movflags +faststart promo/mise-motion.mp4
fi
rm -rf promo/.frames promo/.frames.json promo/.frames.txt promo/.music.wav
echo "Готово: promo/mise-motion.mp4"
