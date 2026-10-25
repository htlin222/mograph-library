#!/bin/bash
# Mix score + voice (score ducks under the voice), limit to −1 dBTP, normalise to −14 LUFS, mux with the picture.
set -e
cd "$(dirname "$0")/.."
B=trailer/build
ffmpeg -y -loglevel error -i $B/music.wav -i $B/vo.wav -filter_complex "\
[1:a]asplit=2[vo][sc];\
[0:a][sc]sidechaincompress=threshold=0.03:ratio=5:attack=8:release=220:makeup=1[duck];\
[duck][vo]amix=inputs=2:weights='1 1.15':normalize=0[mix]" -map "[mix]" -c:a pcm_f32le $B/mix_raw.wav
# measure, then apply the gain that lands on −14 LUFS (two-pass loudnorm, linear)
J=$(ffmpeg -hide_banner -i $B/mix_raw.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
gi() { echo "$J" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -loglevel error -i $B/mix_raw.wav -af "loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=$(gi input_i):measured_TP=$(gi input_tp):measured_LRA=$(gi input_lra):measured_thresh=$(gi input_thresh):offset=$(gi target_offset):linear=true,aresample=48000" -c:a pcm_s24le $B/mix.wav
ls $B/part_*.mp4 | sort | sed "s#.*/#file '#; s#\$#'#" > $B/parts.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i $B/parts.txt -i $B/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart $B/trailer_master.mp4
ffmpeg -y -loglevel error -i $B/trailer_master.mp4 -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart $B/BW-Motion_Trailer_16x9.mp4
ffmpeg -hide_banner -nostats -i $B/BW-Motion_Trailer_16x9.mp4 -vn -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
ls -la $B/BW-Motion_Trailer_16x9.mp4
