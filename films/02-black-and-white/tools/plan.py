"""Which segments should CI render?  Prints a JSON list of ids, e.g. ["e01","e17"].
  plan.py all | e01,e17          explicit (workflow_dispatch)
  plan.py --diff <before> <after>   from a push: scenes/eNN.js → that segment; shared code → all
"""
import json, re, subprocess, sys

ALL = [f'e{i:02d}' for i in range(1, 73)]
ROOT = 'films/02-black-and-white/'
SHARED = ('src/engine.js', 'src/music.js', 'src/curriculum.js', 'src/page.html', 'tools/build.mjs',
          'tools/render.mjs', 'tools/standalone.mjs', 'tools/glyphs.py', 'tools/gain.json', 'package.json', 'package-lock.json')

def from_diff(before, after):
    if not before or set(before) == {'0'}:
        return ALL
    names = subprocess.run(['git', 'diff', '--name-only', before, after], capture_output=True, text=True, check=True).stdout.split()
    ids = set()
    for n in names:
        if not n.startswith(ROOT):
            continue
        rel = n[len(ROOT):]
        if rel in SHARED:
            return ALL
        m = re.fullmatch(r'src/scenes/(e\d\d)\.js', rel)
        if m:
            ids.add(m.group(1))
    return sorted(ids)

if sys.argv[1] == '--diff':
    out = from_diff(sys.argv[2], sys.argv[3])
else:
    arg = sys.argv[1].strip() or 'all'
    out = ALL if arg == 'all' else sorted({s.strip() for s in arg.split(',') if s.strip()})
    bad = [s for s in out if s not in ALL]
    if bad:
        sys.exit(f'unknown segment ids: {bad}')
print(json.dumps(out, separators=(',', ':')))
