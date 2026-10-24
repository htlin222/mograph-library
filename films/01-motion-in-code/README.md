# 01 · Motion, in Code

12 種動態設計技法，每段 6 秒（剛體物理 8 秒），加片頭片尾約 84 秒；9:16 直式 1080×1920、30 fps、120 BPM。
每一格畫面與每一個聲音都由程式算出：Canvas2D、WebGL2 著色器、matter.js 物理、Web Audio 合成。

| # | 效果 | 技術 | 原始碼 |
|---|---|---|---|
| 01 | 時間感 TIMING | 解析式拋物線、擠壓伸展 | [`s01.js`](src/scenes/s01.js) |
| 02 | 動態字體 VARIABLE TYPE | 可變字型寬度軸、外框內插 | [`s02.js`](src/scenes/s02.js) |
| 03 | 形狀變形 SHAPE MORPH | 解析式彈簧、路徑對應 | [`s03.js`](src/scenes/s03.js) |
| 04 | 黏土 3D CLAY 3D | SDF 光線步進 | [`s04.js`](src/scenes/s04.js) |
| 05 | 節奏網格 RHYTHM GRID | 拍點、交錯 | [`s05.js`](src/scenes/s05.js) |
| 06 | 流動線條 FLOW LINES | Perlin 流場 | [`s06.js`](src/scenes/s06.js) |
| 07 | 液態玻璃 LIQUID GLASS | SDF smooth-min、折射與色散 | [`s07.js`](src/scenes/s07.js) |
| 08 | 光線步進 RAY MARCHING | SDF 場景、柔和陰影 | [`s08.js`](src/scenes/s08.js) |
| 09 | 二十萬粒子 200,000 PARTICLES | GPU 逐格解析式粒子 | [`s09.js`](src/scenes/s09.js) |
| 10 | 反應擴散 REACTION–DIFFUSION | Gray–Scott、乒乓緩衝 | [`s10.js`](src/scenes/s10.js) |
| 11 | 著色器風格化 SHADER STYLIZATION | 後製著色器 | [`s11.js`](src/scenes/s11.js) |
| 12 | 剛體物理 RIGID BODIES | matter.js 240 Hz 固定步長 | [`s12.js`](src/scenes/s12.js) |

場景 API 見 [`CONTRACT.md`](CONTRACT.md)；`test/` 是 WebGL / 播放器的煙霧測試。

## 產出

需求同 [02](../02-black-and-white/README.md#環境)（Node、Python + fonttools、ffmpeg、Noto Sans CJK）。

```bash
npm install && npx playwright install chromium
npm run all                                   # build → 配樂 → 全部段落 → dist/motion-in-code.mp4
node tools/render.mjs stills s07 1,3,5        # 單段縮圖 → build/stills/s07_sheet.jpg
node tools/render.mjs video s07 && npm run mux # 單段重算後重新串接
```

成片（`Motion-in-Code_Opus5.5.mp4`）放在 GitHub Releases。
