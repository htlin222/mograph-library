import json, sys, re, collections
d = json.load(open(sys.argv[1]))
T = {
 'Kinetic Typography 動態字體': r'kinetic typ|typograph|text animation|動態字',
 'Product / SaaS launch 產品發表': r'saas|product launch|launch video|startup|app promo|發表',
 'Logo animation 標誌動畫': r'logo',
 'Explainer 解說': r'explain|tutorial|how .* works|解說|教學',
 'Data viz 資料動畫': r'\bcharts?\b|\bgraphs?\b|data vi|statistic|圖表',
 'UI motion 介面動態': r'\bui\b|interface|button|toggle|dashboard|介面',
 'Particles 粒子': r'particle|粒子',
 'Shader / ray marching 著色器': r'shader|glsl|ray ?march|sdf|著色',
 '3D scene 3D 場景': r'three\.?js|\b3d\b',
 'Game 遊戲': r'\bgame\b|playable|遊戲',
 'Physics 物理': r'physic|gravity|collision|物理|重力',
 'Generative 生成藝術': r'generative|flow field|noise|perlin|fractal|生成',
 'Pixel art 像素': r'pixel art|pixel|像素',
 'Glitch 故障': r'glitch|故障',
 'Isometric 等角': r'isometric|等角',
 'Clay / soft 3D 黏土': r'clay|黏土',
 'Liquid / glass 液態玻璃': r'liquid|glass|玻璃|液態',
 'Paper / collage 剪紙拼貼': r'paper.?cut|cut.?out|collage|剪紙|拼貼',
 'Hand-drawn 手繪': r'hand.?drawn|sketch|doodle|手繪',
 'Reaction–diffusion 反應擴散': r'reaction.?diffusion|gray.?scott|反應擴散',
 'Variable font 可變字體': r'variable font|font.?weight axis|可變字',
 'Music video / lyric 音樂視覺': r'music video|lyric|visuali[sz]er|歌詞',
 'Halftone / riso / dither 印刷質感': r'halftone|risograph|dither|半色調|網點',
 'Map / geography 地圖': r'\bmap\b|globe|地圖|地球',
}
c = {k: sum(1 for x in d if re.search(r, (x.get('prompt') or '').lower())) for k, r in T.items()}
for k, v in sorted(c.items(), key=lambda z: -z[1]): print(f'{v:4d}  {k}')
json.dump(c, open(sys.argv[2], 'w'), ensure_ascii=False)
