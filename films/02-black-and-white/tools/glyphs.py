"""Extract Archivo outlines for a few glyphs on a (wdth x wght) instance grid.

Outputs JSON: {upm, wdth:[...], wght:[...], glyphs:{ch:{adv:[[..]], cmds:[...], pts:[[[x,y,...]]] }}}
Each glyph's command list is identical across instances (same point structure), so the
runtime can interpolate point arrays piecewise-bilinearly -> continuous width axis.
"""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import RecordingPen

SRC = 'node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'
CHARS = sys.argv[1] if len(sys.argv) > 1 else 'MOTIN'
WDTH = [62, 100, 125]
WGHT = [100, 400, 900]

out = {'wdth': WDTH, 'wght': WGHT, 'glyphs': {}}
inst = {}
for wd in WDTH:
    for wg in WGHT:
        f = TTFont(SRC)
        inst[(wd, wg)] = instantiateVariableFont(f, {'wdth': wd, 'wght': wg})
base = inst[(100, 400)]
out['upm'] = base['head'].unitsPerEm
cmap = base.getBestCmap()
for ch in CHARS:
    gname = cmap[ord(ch)]
    cmds_ref = None
    pts_grid = []
    adv_grid = []
    for wd in WDTH:
        prow, arow = [], []
        for wg in WGHT:
            f = inst[(wd, wg)]
            gs = f.getGlyphSet()
            pen = RecordingPen()
            gs[gname].draw(pen)
            cmds = [op for op, _ in pen.value]
            flat = []
            for op, args in pen.value:
                for p in args:
                    flat += [round(p[0], 1), round(p[1], 1)]
            if cmds_ref is None:
                cmds_ref = cmds
            assert cmds == cmds_ref, (ch, wd, wg)
            prow.append(flat)
            arow.append(f['hmtx'][gname][0])
        pts_grid.append(prow)
        adv_grid.append(arow)
    code = {'moveTo': 'M', 'lineTo': 'L', 'qCurveTo': 'Q', 'curveTo': 'C', 'closePath': 'Z', 'endPath': 'E'}
    # qCurveTo may carry several off-curve points; store arg counts too
    pen = RecordingPen(); base.getGlyphSet()[gname].draw(pen)
    out['glyphs'][ch] = {
        'ops': ''.join(code[op] for op, _ in pen.value),
        'n': [len(a) for _, a in pen.value],
        'pts': pts_grid,
        'adv': adv_grid,
    }
json.dump(out, open('build/glyphs.json', 'w'), separators=(',', ':'))
print('ok', {k: len(v['ops']) for k, v in out['glyphs'].items()})
