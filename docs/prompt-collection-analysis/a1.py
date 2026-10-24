import json, sys, collections, re, statistics
d = json.load(open(sys.argv[1]))
C = collections.Counter
print('n', len(d))
print('category', C(x['category'] for x in d).most_common())
print('tech', C(t for x in d for t in x.get('tech_tags', [])).most_common(30))
print('partial', C(x.get('prompt_partial') for x in d))
print('has_remake', C(x.get('has_remake') for x in d))
print('added', sorted(C(x['added'][:7] for x in d).items()))
ps = [x.get('prompt') or '' for x in d]
print('empty prompts', sum(1 for p in ps if not p.strip()))
L = [len(p) for p in ps if p.strip()]
W = [len(p.split()) for p in ps if p.strip()]
print('chars median', statistics.median(L), 'p25', sorted(L)[len(L)//4], 'p75', sorted(L)[3*len(L)//4], 'max', max(L))
print('words median', statistics.median(W))
for lim in (100, 200, 400, 1000, 3000):
    print(f'<= {lim} chars:', sum(1 for l in L if l <= lim))
# exact & near-duplicate prompts
norm = lambda s: re.sub(r'\W+', ' ', s.lower()).strip()
cnt = C(norm(p) for p in ps if p.strip())
dups = [(k, v) for k, v in cnt.items() if v > 1]
print('distinct prompts', len(cnt), 'dup groups', len(dups), 'entries in dup groups', sum(v for _, v in dups))
for k, v in sorted(dups, key=lambda z: -z[1])[:8]:
    print(v, '|', k[:160])
# language
cjk = sum(1 for p in ps if re.search(r'[一-鿿]', p))
jp = sum(1 for p in ps if re.search(r'[぀-ヿ]', p))
print('has CJK', cjk, 'has kana', jp)
print('authors', len(set(x['author'] for x in d)))
