"""Voice-over for the trailer: espeak-ng speaks each line, a 28-band channel vocoder plays it on a supersaw
chord in the key of the score (F minor progression, same bar grid as music.js), a pitched-down dry copy keeps it
intelligible, and the chops are stuttered, pitched stabs. Output: trailer/build/vo.wav (48 kHz stereo, film length).
Run from films/02-black-and-white after `node trailer/render.mjs plan`."""
import json, subprocess, tempfile, os
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

SR = 48000
plan = json.load(open('trailer/build/plan.json'))
BEAT = plan['beat']
KEY = 41
PROG = [[0, [0, 3, 7]], [-4, [0, 4, 7]], [3, [0, 4, 7]], [-2, [0, 4, 7]]]
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

def speak(text, speed=128, pitch=28):
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, 'v.wav')
        subprocess.run(['espeak-ng', '-v', 'en-us+m3', '-s', str(speed), '-p', str(pitch), '-g', '2', '-w', f, text], check=True)
        x, sr = sf.read(f, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    x = resample_poly(x, SR, sr).astype(np.float32)
    nz = np.nonzero(np.abs(x) > 0.01)[0]                     # trim silence
    x = x[max(0, nz[0] - 200): nz[-1] + 2400] if len(nz) else x
    return x / (np.abs(x).max() + 1e-9)

def supersaw(midis, n, detune=(-0.12, -0.04, 0.04, 0.12)):
    t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    for m in midis:
        for dc in detune:
            f = mtof(m + dc); out += (2 * ((t * f) % 1.0) - 1).astype(np.float32)
    return out / (len(midis) * len(detune))

def vocode(mod, midis, bands=28):
    n = len(mod); car = supersaw(midis, n) + 0.08 * np.random.default_rng(1).standard_normal(n).astype(np.float32)
    edges = np.geomspace(90, 9000, bands + 1); out = np.zeros(n, np.float32)
    env_sos = butter(2, 60, 'low', fs=SR, output='sos')
    for lo, hi in zip(edges[:-1], edges[1:]):
        sos = butter(2, [lo, hi], 'bandpass', fs=SR, output='sos')
        env = sosfilt(env_sos, np.abs(sosfilt(sos, mod)))
        out += sosfilt(sos, car) * env
    hiss = sosfilt(butter(4, 4000, 'high', fs=SR, output='sos'), mod)      # consonants pass through
    out = out / (np.abs(out).max() + 1e-9) + 0.35 * hiss
    return out / (np.abs(out).max() + 1e-9)

def pitch_down(x, semis):                                   # resample: lower and slower, the "trailer giant" voice
    r = 2 ** (semis / 12); up, down = int(round(1000 / r)), 1000
    return resample_poly(x, up, down).astype(np.float32)

def chord_at(b):
    root, iv = PROG[int(b // 4) % 4]
    return [KEY + root + 12 + i for i in iv] + [KEY + root + 24]

total = int((plan['beats'] * BEAT + 1) * SR)
L = np.zeros(total, np.float32); R = np.zeros(total, np.float32)
def place(x, b, gain=1.0, pan=0.0, delay_wide=0):
    s = int(round(b * BEAT * SR)); e = min(total, s + len(x)); seg = x[: e - s] * gain
    L[s:e] += seg * (1 - max(0, pan)); R[s + delay_wide: e] += seg[: len(seg) - delay_wide] * (1 + min(0, pan))

words = {}
for v in plan['vo']:
    dry = speak(v['text'])
    words[v['id']] = dry
    voc = vocode(dry, chord_at(v['b']))
    low = pitch_down(dry, -5)
    # vocoder is the voice; the pitched-down dry copy sits underneath for intelligibility; a short slap echo
    n = max(len(voc), len(low)); mix = np.zeros(n + int(0.3 * SR), np.float32)
    mix[:len(voc)] += 0.8 * voc; mix[:len(low)] += 0.55 * low
    echo = np.zeros_like(mix); d = int(BEAT * 0.75 * SR); echo[d:] = mix[:-d] * 0.28
    place(mix + echo, v['b'], 0.9, 0, delay_wide=int(0.012 * SR))
for c in plan['chops']:
    src = words.get(c['word'])
    if src is None: continue
    stab = vocode(src[: int(0.32 * SR)], [m + c.get('pitch', 0) for m in chord_at(c['b'])])
    stab = stab[: int(BEAT * 0.45 * SR)]
    stab *= np.minimum(1, np.linspace(8, 0, len(stab)))     # quick fade so it is a stab, not a word
    k = c.get('stutter', 1)
    for j in range(k):                                       # stutter: the same slice re-triggered on 16ths
        place(stab[: int(BEAT / 4 * SR)] if k > 1 else stab, c['b'] + j * 0.25, 0.55, pan=(0.35 if j % 2 else -0.35))
sf.write('trailer/build/vo.wav', np.stack([L, R], 1), SR, subtype='FLOAT')
print('vo.wav', round(total / SR, 1), 's', 'peak', round(float(max(np.abs(L).max(), np.abs(R).max())), 2))
