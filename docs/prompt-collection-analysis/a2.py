import json, sys, re, collections
d = json.load(open(sys.argv[1]))
ps = [(x['slug'], x['category'], x.get('prompt') or '', x.get('prompt_partial')) for x in d]
F = {
 '主體 subject': r'logo|text|title|word|letter|typograph|product|app|ui|character|ball|cube|sphere|particle|shape|icon|poster|car|city|planet|robot|文字|標誌|logo|角色|產品|粒子|字',
 '動作 motion': r'morph|rotat|spin|bounce|fly|zoom|explod|assembl|reveal|slide|fall|grow|transform|dissolv|scatter|orbit|float|wave|pulse|swirl|flip|unfold|draw|變形|旋轉|彈|飛|爆|聚|揭|滑|落|生長|飄|轉場',
 '時間 time': r'\b\d+(\.\d+)?\s*(s|sec|secs|second|seconds|ms|fps|bpm)\b|second|duration|frame rate|fps|bpm|beat|\d+\s*秒|秒|節拍|拍',
 '質感 feel/easing': r'eas(e|ing)|spring|overshoot|snappy|smooth|bouncy|elastic|inertia|weight|squash|stretch|anticipat|follow.through|overlap|timing|spacing|curve|damp|緩動|彈簧|回彈|擠壓|曲線|節奏感|俐落',
 '構成與鏡頭 composition/camera': r'camera|dolly|pan |tilt|close.?up|wide shot|composition|depth of field|dof|perspective|framing|grid|layout|centered|parallax|鏡頭|構圖|景深|推進|環繞|視差|版面',
 '轉場 transition': r'transition|cut to|match cut|wipe|crossfade|dissolve|fade|whip|seamless|loop|轉場|淡入|淡出|剪接|循環',
 '風格 style': r'style|aesthetic|minimal|swiss|bauhaus|brutal|retro|neon|cyberpunk|vaporwave|clay|paper|pixel|isometric|cinematic|apple|glass|grain|palette|color|colour|monochrome|black and white|風格|極簡|配色|顏色|質感|復古|霓虹',
 '聲音 sound': r'sound|audio|music|sfx|soundtrack|beat|voice|narrat|音樂|音效|配樂|聲音|旁白',
 '規格 spec': r'1080|1920|4k|16:9|9:16|1:1|4:5|vertical|portrait|landscape|aspect|resolution|mp4|webm|export|render|直式|橫式|解析度|比例|輸出',
}
cov = collections.Counter(); per = []
for slug, cat, p, part in ps:
    s = p.lower(); hit = [k for k, r in F.items() if re.search(r, s)]
    for k in hit: cov[k] += 1
    per.append((len(hit), slug, cat, len(p), part))
n = len(ps)
print('FIELD COVERAGE (share of 703 prompts mentioning it)')
for k in F: print(f'{k:32s} {cov[k]:4d}  {cov[k]/n*100:5.1f}%')
dist = collections.Counter(h for h, *_ in per)
print('fields per prompt', sorted(dist.items()))
print('<=2 fields', sum(v for k, v in dist.items() if k <= 2), ' >=6 fields', sum(v for k, v in dist.items() if k >= 6))
# famous phrases
for pat in [r'showreel|show reel|demo reel', r"don'?t ask|do not ask|without asking|no questions|別問|不要問|直接做", r'world.class|top.tier|award.winning|professional', r'motion design(er)?', r'apple', r'15.second|15s\b|15 秒']:
    c = sum(1 for _, _, p, _ in ps if re.search(pat, p.lower()))
    print(f'{pat:60s} {c}')
json.dump({'cov': {k: cov[k] for k in F}, 'n': n, 'dist': dict(dist)}, open(sys.argv[2], 'w'), ensure_ascii=False)
