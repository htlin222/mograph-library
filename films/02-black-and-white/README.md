# 02 · 黑白動態全書 Black & White Motion

只用黑與白，示範 72 種動態設計技法；每段 20 秒，畫面上方是效果本身，下方是「怎麼用 prompt 做到」的說明：Prompt、做法、練習。
全片 9 章、約 24 分 50 秒，9:16 直式 1080×1920、30 fps，配樂由程式即時合成（Web Audio），整體響度 −14 LUFS。

每一格畫面都是 `frame(ctx, t)` 的純函數輸出，沒有任何圖片、影片或音效素材。

## 目錄結構

```
src/
  engine.js        共用引擎：版面（頁首 / 1080² 舞台 / 說明面板）、字型、緩動、雜訊、WebGL、M.sim 固定步長模擬
  curriculum.js    9 章的標題與順序
  music.js         每章的配樂編排與音效 cue 類型
  page.html        播放器與錄製模式（?record=1）
  scenes/
    intro.js  outro.js
    e01.js … e72.js    ← 一段一檔；要微調哪一段就改哪一檔
tools/
  build.mjs        把 src 打包成單一 dist/index.html（字型子集化、glyph 外框、matter.js 全部內嵌）
  render.mjs       stills / video / audio：無頭 Chromium 逐格算圖 → ffmpeg
  audio.py         接合各章音訊、限幅並校正到 −14 LUFS → build/music.wav、build/gain.json
  sheets.mjs       一次輸出所有段落的縮圖表
  glyphs.py        從 Archivo 可變字型抽出字母外框（章節卡大數字用）
  master.sh        依時間軸串接全部段落 + 混入配樂 → dist/bw-master.mp4
  retake.sh        單段重拍：改完 eNN.js 後一行指令重算該段與總片
  standalone.mjs   把段落輸出成帶自己配樂的獨立影片（CI 也用它）
  plan.py          CI 用：從 git diff 判斷要重算哪些段
  gain.json        總片校正出的配樂增益
catalog/           72 段的 Prompt / 做法 / 練習（catalog.json 與各章 markdown 表）
CONTRACT.md        場景 API 與 72 個概念的規格（寫新段落或交給 AI 改之前先讀）
```

`build/`、`dist/` 都是產物，不進 git。

## 環境

- Node 20+、Python 3.10+（`fonttools`、`numpy`、`soundfile`）、ffmpeg
- 系統字型 Noto Sans CJK（`fonts-noto-cjk`，build 會從 `/usr/share/fonts/opentype/noto/` 子集化繁中字型）
- `npm install && npx playwright install chromium`

WebGL 段落在無頭 Chromium 裡走 SwiftShader（CPU），每格約 0.15–0.7 秒；72 段全算約 4–6 小時（2 個 worker）。

## 從零產出整部片

```bash
npm install
npm run all          # build → 合成配樂並校正響度 → 再 build（帶入增益）→ 全部段落 → 串接總片
```

## 微調某一段（最常用）

1. 改 `src/scenes/e17.js`（畫面在 `frame()`，說明文字在 `prompt` / `how` / `practice`，音效在 `cues`）
2. 先在瀏覽器看：`npm run build`，打開 `dist/index.html`，用播放器跳到該段
3. 出縮圖確認：`node tools/render.mjs stills e17 2,6,10,14,18` → `build/stills/e17_sheet.jpg`
4. 重算並更新總片：

```bash
tools/retake.sh e17              # 一段
tools/retake.sh e17,e18,ch3      # 多段（章節卡 id 為 ch1…ch9）
MUSIC=1 tools/retake.sh e17      # 改了 cues 或節拍時，連配樂一起重算
```

段長固定 20 秒，所以改一段不會影響其他段的時間碼；只有改了 `cues`（音效點）才需要重算配樂。

### 改動的規則

- `frame` 必須每次畫滿整個舞台、只依賴 `t`（不能依賴上一格），否則跳格預覽與平行算圖會不一致。
- 模擬類（物理、反應擴散、粒子）用 `M.sim(this, t, step, hz)`，固定步長、倒帶自動重置。
- 全片保證只有灰階：引擎會在每格做一次去彩度，所以顏色不會漏進成片。
- 說明面板空間固定：Prompt 最多 4 行、做法以 3 條為準，改完請看縮圖確認沒有溢出。

## 獨立的 72 部影片（GitHub Actions）

[`.github/workflows/render-segments.yml`](../../.github/workflows/render-segments.yml) 把每一段算成一部獨立的 20 秒影片：畫面加上它自己那 20 秒的配樂（沿用總片的 −14 LUFS 增益，`tools/gain.json`），檔名像 `e01-timing-and-spacing.mp4`，放在 Releases 的 **segments**。

- **改了某段就自動重拍**：push 到 main 時，改了 `src/scenes/e17.js` 只重算 e17；改了引擎、配樂或工具（`engine.js`、`music.js`、`tools/*` 等）就重算全部 72 段。同一段的舊檔會被覆蓋。
- **手動**：Actions → Render segments → Run workflow，填 `all` 或 `e01,e17`。
- 每段一個 job、最多 20 個同時跑；每個 job 另外留一張縮圖表（artifact，保留 30 天），方便在手機上檢查。

本機做同一件事：`node tools/standalone.mjs e17`（或 `all`）→ `dist/segments/`。

## 72 段索引

### 第 1 章　時間與緩動 · TIMING & EASING

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 01 | 0:13 | **時距與間距** TIMING & SPACING | [`e01.js`](src/scenes/e01.js) | 黑 |
| 02 | 0:33 | **緩動曲線** EASING CURVES | [`e02.js`](src/scenes/e02.js) | 白 |
| 03 | 0:53 | **彈簧** SPRING | [`e03.js`](src/scenes/e03.js) | 黑 |
| 04 | 1:13 | **擠壓與伸展** SQUASH & STRETCH | [`e04.js`](src/scenes/e04.js) | 白 |
| 05 | 1:33 | **預備、跟隨與重疊** ANTICIPATION & FOLLOW-THROUGH | [`e05.js`](src/scenes/e05.js) | 黑 |
| 06 | 1:53 | **交錯** STAGGER | [`e06.js`](src/scenes/e06.js) | 白 |
| 07 | 2:13 | **對拍** BEAT SYNC | [`e07.js`](src/scenes/e07.js) | 黑 |
| 08 | 2:33 | **無縫循環** SEAMLESS LOOP | [`e08.js`](src/scenes/e08.js) | 白 |

### 第 2 章　程序與模擬 · PROCEDURE & SIMULATION

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 09 | 2:56 | **振盪與諧振圖** OSCILLATION & HARMONOGRAPH | [`e09.js`](src/scenes/e09.js) | 白 |
| 10 | 3:16 | **雜訊** PERLIN NOISE | [`e10.js`](src/scenes/e10.js) | 黑 |
| 11 | 3:36 | **流場** FLOW FIELD | [`e11.js`](src/scenes/e11.js) | 白 |
| 12 | 3:56 | **群集** BOIDS | [`e12.js`](src/scenes/e12.js) | 黑 |
| 13 | 4:16 | **剛體物理** RIGID BODIES | [`e13.js`](src/scenes/e13.js) | 白 |
| 14 | 4:36 | **布料** CLOTH (VERLET) | [`e14.js`](src/scenes/e14.js) | 黑 |
| 15 | 4:56 | **反應擴散** REACTION–DIFFUSION | [`e15.js`](src/scenes/e15.js) | 白 |
| 16 | 5:16 | **細胞自動機** CELLULAR AUTOMATA | [`e16.js`](src/scenes/e16.js) | 黑 |

### 第 3 章　形狀與圖形 · SHAPE & GRAPHICS

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 17 | 5:39 | **路徑描繪** DRAW-ON / TRIM PATHS | [`e17.js`](src/scenes/e17.js) | 白 |
| 18 | 5:59 | **形狀變形** SHAPE MORPH | [`e18.js`](src/scenes/e18.js) | 黑 |
| 19 | 6:19 | **遮罩揭示** MASK REVEALS | [`e19.js`](src/scenes/e19.js) | 白 |
| 20 | 6:39 | **融合球** METABALLS | [`e20.js`](src/scenes/e20.js) | 黑 |
| 21 | 6:59 | **重複器** REPEATERS & ARRAYS | [`e21.js`](src/scenes/e21.js) | 白 |
| 22 | 7:19 | **布林運算** BOOLEANS | [`e22.js`](src/scenes/e22.js) | 黑 |
| 23 | 7:39 | **碎裂** SHATTER | [`e23.js`](src/scenes/e23.js) | 白 |
| 24 | 7:59 | **等角** ISOMETRIC | [`e24.js`](src/scenes/e24.js) | 黑 |

### 第 4 章　動態字體 · KINETIC TYPE

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 25 | 8:22 | **動態字體** KINETIC TYPOGRAPHY | [`e25.js`](src/scenes/e25.js) | 黑 |
| 26 | 8:42 | **可變字體** VARIABLE FONT AXES | [`e26.js`](src/scenes/e26.js) | 白 |
| 27 | 9:02 | **打字機與解碼** TYPEWRITER & SCRAMBLE | [`e27.js`](src/scenes/e27.js) | 黑 |
| 28 | 9:22 | **拆字交錯** SPLIT-TEXT STAGGER | [`e28.js`](src/scenes/e28.js) | 白 |
| 29 | 9:42 | **文字遮罩** TEXT AS MASK | [`e29.js`](src/scenes/e29.js) | 黑 |
| 30 | 10:02 | **文字路徑** TYPE ON PATH | [`e30.js`](src/scenes/e30.js) | 白 |
| 31 | 10:22 | **數字滾動** COUNTERS & ODOMETERS | [`e31.js`](src/scenes/e31.js) | 黑 |
| 32 | 10:42 | **文字粒子化** TEXT DISINTEGRATION | [`e32.js`](src/scenes/e32.js) | 白 |

### 第 5 章　3D 與光 · 3D & LIGHT

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 33 | 11:05 | **SDF 與平滑聯集** SDF · SMOOTH UNION | [`e33.js`](src/scenes/e33.js) | 黑 |
| 34 | 11:25 | **柔和陰影與環境光遮蔽** SOFT SHADOWS & AO | [`e34.js`](src/scenes/e34.js) | 白 |
| 35 | 11:45 | **無限晶格** DOMAIN REPETITION | [`e35.js`](src/scenes/e35.js) | 黑 |
| 36 | 12:05 | **線框地形** WIREFRAME TERRAIN | [`e36.js`](src/scenes/e36.js) | 黑 |
| 37 | 12:25 | **點雲** POINT CLOUD | [`e37.js`](src/scenes/e37.js) | 白 |
| 38 | 12:45 | **體積光** GOD RAYS | [`e38.js`](src/scenes/e38.js) | 黑 |
| 39 | 13:05 | **折射玻璃** GLASS REFRACTION | [`e39.js`](src/scenes/e39.js) | 白 |
| 40 | 13:25 | **卡通著色與描邊** TOON SHADING & OUTLINE | [`e40.js`](src/scenes/e40.js) | 白 |

### 第 6 章　生成演算法 · GENERATIVE ALGORITHMS

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 41 | 13:48 | **沃羅諾伊** VORONOI DIAGRAM | [`e41.js`](src/scenes/e41.js) | 白 |
| 42 | 14:08 | **德勞內三角化** DELAUNAY TRIANGULATION | [`e42.js`](src/scenes/e42.js) | 黑 |
| 43 | 14:28 | **圓填充** CIRCLE PACKING | [`e43.js`](src/scenes/e43.js) | 白 |
| 44 | 14:48 | **特魯謝磚** TRUCHET TILES | [`e44.js`](src/scenes/e44.js) | 黑 |
| 45 | 15:08 | **L 系統** L-SYSTEM | [`e45.js`](src/scenes/e45.js) | 白 |
| 46 | 15:28 | **差分增長** DIFFERENTIAL GROWTH | [`e46.js`](src/scenes/e46.js) | 黑 |
| 47 | 15:48 | **奇異吸引子** STRANGE ATTRACTORS | [`e47.js`](src/scenes/e47.js) | 白 |
| 48 | 16:08 | **碎形縮放** MANDELBROT ZOOM | [`e48.js`](src/scenes/e48.js) | 黑 |

### 第 7 章　後製與風格化 · POST & STYLIZATION

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 49 | 16:31 | **遞色** DITHERING | [`e49.js`](src/scenes/e49.js) | 黑 |
| 50 | 16:51 | **半色調** HALFTONE | [`e50.js`](src/scenes/e50.js) | 白 |
| 51 | 17:11 | **ASCII 字元畫** ASCII RENDERING | [`e51.js`](src/scenes/e51.js) | 黑 |
| 52 | 17:31 | **像素排序** PIXEL SORTING | [`e52.js`](src/scenes/e52.js) | 白 |
| 53 | 17:51 | **故障** GLITCH | [`e53.js`](src/scenes/e53.js) | 黑 |
| 54 | 18:11 | **底片與 CRT** FILM & CRT | [`e54.js`](src/scenes/e54.js) | 白 |
| 55 | 18:31 | **回饋殘影** FEEDBACK ECHO | [`e55.js`](src/scenes/e55.js) | 黑 |
| 56 | 18:51 | **狹縫掃描** SLIT-SCAN | [`e56.js`](src/scenes/e56.js) | 白 |

### 第 8 章　構成、鏡頭、轉場 · COMPOSITION · CAMERA · CUTS

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 57 | 19:14 | **構圖法則** COMPOSITION | [`e57.js`](src/scenes/e57.js) | 白 |
| 58 | 19:34 | **視差與 2.5D** PARALLAX & 2.5D | [`e58.js`](src/scenes/e58.js) | 黑 |
| 59 | 19:54 | **推軌變焦** DOLLY ZOOM | [`e59.js`](src/scenes/e59.js) | 白 |
| 60 | 20:14 | **無限縮放** INFINITE ZOOM · DROSTE | [`e60.js`](src/scenes/e60.js) | 黑 |
| 61 | 20:34 | **穿越轉場** ZOOM-THROUGH TRANSITION | [`e61.js`](src/scenes/e61.js) | 白 |
| 62 | 20:54 | **擦除與遮罩轉場** WIPES & MASK TRANSITIONS | [`e62.js`](src/scenes/e62.js) | 黑 |
| 63 | 21:14 | **匹配剪接** MATCH CUT | [`e63.js`](src/scenes/e63.js) | 白 |
| 64 | 21:34 | **分割畫面** SPLIT SCREEN | [`e64.js`](src/scenes/e64.js) | 黑 |

### 第 9 章　介面、資料、聲音 · INTERFACE · DATA · SOUND

| # | 時間 | 效果 | 原始碼 | 底 |
|---|---|---|---|---|
| 65 | 21:57 | **微互動** MICRO-INTERACTIONS | [`e65.js`](src/scenes/e65.js) | 白 |
| 66 | 22:17 | **共享元素轉換** SHARED-ELEMENT TRANSITION | [`e66.js`](src/scenes/e66.js) | 黑 |
| 67 | 22:37 | **載入與骨架屏** LOADERS & SKELETONS | [`e67.js`](src/scenes/e67.js) | 白 |
| 68 | 22:57 | **資料動畫** DATA ANIMATION | [`e68.js`](src/scenes/e68.js) | 黑 |
| 69 | 23:17 | **音訊視覺化** AUDIO VISUALIZER | [`e69.js`](src/scenes/e69.js) | 白 |
| 70 | 23:37 | **捲動敘事** SCROLL-DRIVEN STORY | [`e70.js`](src/scenes/e70.js) | 黑 |
| 71 | 23:57 | **動態設計系統** MOTION TOKENS | [`e71.js`](src/scenes/e71.js) | 白 |
| 72 | 24:17 | **frame = f(t)** EVERYTHING IS A FUNCTION OF TIME | [`e72.js`](src/scenes/e72.js) | 黑 |

完整的 Prompt、做法與練習見 [`catalog/`](catalog/) 或 [`docs/learning-map/08-black-and-white-book.md`](../../docs/learning-map/08-black-and-white-book.md)。
