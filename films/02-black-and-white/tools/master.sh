#!/bin/bash
# Concatenate every segment in timeline order and mux the calibrated music → dist/bw-master.mp4
set -e
cd "$(dirname "$0")/.."
ids="intro ch1 $(seq -f 'e%02g' 1 8) ch2 $(seq -f 'e%02g' 9 16) ch3 $(seq -f 'e%02g' 17 24) ch4 $(seq -f 'e%02g' 25 32) ch5 $(seq -f 'e%02g' 33 40) ch6 $(seq -f 'e%02g' 41 48) ch7 $(seq -f 'e%02g' 49 56) ch8 $(seq -f 'e%02g' 57 64) ch9 $(seq -f 'e%02g' 65 72) outro"
: > build/seg/all.txt
for i in $ids; do
  test -f build/seg/$i.mp4 || { echo "MISSING build/seg/$i.mp4 — run: node tools/render.mjs video $i"; exit 1; }
  echo "file '$i.mp4'" >> build/seg/all.txt
done
mkdir -p dist
ffmpeg -y -loglevel error -f concat -safe 0 -i build/seg/all.txt -i build/music.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart dist/bw-master.mp4
echo "dist/bw-master.mp4 written"
