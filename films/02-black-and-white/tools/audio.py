"""Stitch chapter audio chunks (overlap-add their 4 s tails) into build/mix.wav, then calibrate with ffmpeg
(streaming, low memory): gain → look-ahead limiter at −1.5 dBFS → EBU R128 / BS.1770 measure; iterate the gain
until integrated loudness is −14.0 LUFS. Writes build/music.wav (24-bit) and build/gain.json."""
import json, re, subprocess, sys
import numpy as np, soundfile as sf

SR = 48000
meta = json.load(open('build/audio/chunks.json'))
total = int(np.ceil((meta['duration'] + 0.5) * SR))
mix = np.zeros((total, 2), np.float32)
for gp in meta['groups']:
    x, sr = sf.read(f"build/audio/{gp['key']}.wav", dtype='float32'); assert sr == SR
    a = int(round(gp['t0'] * SR)); b = min(total, a + len(x))
    mix[a:b] += x[: b - a]
fl = int(0.5 * SR); mix[-fl:] *= np.linspace(1, 0, fl, dtype=np.float32)[:, None]
sf.write('build/mix.wav', mix, SR, subtype='FLOAT')
del mix
print('stitched', total / SR, 's', flush=True)

def run(gain_db, out=None):
    chain = f"volume={gain_db:.3f}dB,alimiter=limit=0.8414:level=disabled:attack=5:release=80:asc=1,ebur128=peak=true"
    cmd = ['ffmpeg', '-hide_banner', '-nostats', '-i', 'build/mix.wav', '-af', chain]
    cmd += (['-c:a', 'pcm_s24le', '-y', out] if out else ['-f', 'null', '-'])
    r = subprocess.run(cmd, capture_output=True, text=True).stderr
    summ = r[r.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    P = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return I, P

g = 0.0
for it in range(5):
    I, P = run(g)
    print(f'iter {it}: gain {g:+.2f} dB → {I:.2f} LUFS, true peak {P:.2f} dBTP', flush=True)
    if abs(I + 14.0) < 0.05: break
    g += -14.0 - I
I, P = run(g, 'build/music.wav')
print(f'final integrated {I:.2f} LUFS, true peak {P:.2f} dBTP, gain {g:+.2f} dB', flush=True)
json.dump({'gain': 10 ** (g / 20), 'lufs': I, 'truePeak': P}, open('build/gain.json', 'w'))
