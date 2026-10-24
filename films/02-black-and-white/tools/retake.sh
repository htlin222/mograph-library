#!/bin/bash
# Re-render one or more segments after editing src/scenes/<id>.js, then rebuild the master.
#   tools/retake.sh e17            # one segment
#   tools/retake.sh e17,e18,ch3    # several
#   MUSIC=1 tools/retake.sh e17    # also re-synthesize the soundtrack (needed when cues/timing changed)
set -e
cd "$(dirname "$0")/.."
ids=${1:?usage: tools/retake.sh <id[,id…]>}
npm run build --silent
node tools/render.mjs stills "${ids%%,*}" 2,6,10,14,18          # quick contact sheet → build/stills/
if [ -n "$MUSIC" ]; then node tools/render.mjs audio && python3 tools/audio.py && npm run build --silent; fi
node tools/render.mjs video "$ids" 2
node tools/render.mjs video outro 1                            # outro prints code stats, keep it current
tools/master.sh
