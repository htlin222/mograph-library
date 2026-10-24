# mograph-library

用程式碼做動態設計（code to animation）的學習庫：一份 MECE 的學習地圖與語彙，加上兩部完全由程式產生的示範影片的全部原始碼。不使用任何 GUI 動畫軟體，每一格畫面與每一個聲音都是算出來的。

## 內容

| | 說明 |
|---|---|
| [`docs/learning-map/`](docs/learning-map/) | 動態設計學習地圖：八個分支、描述公式、大詞索引、五份語彙、提示詞實戰、黑白動態全書 |
| [`docs/prompt-collection-analysis/`](docs/prompt-collection-analysis/) | 對 703 條公開 Opus 5.5 影片提示詞的分析腳本與資料 |
| [`films/01-motion-in-code/`](films/01-motion-in-code/) | 《Motion, in Code》：12 種技法 × 6 秒，約 84 秒 |
| [`films/02-black-and-white/`](films/02-black-and-white/) | 《黑白動態全書》：只用黑白示範 72 種技法 × 20 秒，附 Prompt／做法／練習，約 24 分 50 秒 |

成片 MP4 放在 [Releases](../../releases)（影片太大不進 git）。

## 共同做法

- **純函數算圖**：每段寫成 `frame(ctx, t)`，畫面只由時間 `t` 決定，所以能任意跳格、平行算圖、逐格比對。
- **固定步長模擬**：物理、反應擴散等用 `M.sim` 以固定 Hz 推進，倒帶自動重置，結果可重現。
- **單檔打包**：`tools/build.mjs` 把引擎、場景、子集化字型、函式庫打成一個自足的 HTML，可直接在瀏覽器播放。
- **無頭錄製**：Playwright + Chromium（WebGL 走 SwiftShader）逐格擷取 PNG → ffmpeg H.264。
- **程式配樂**：Web Audio `OfflineAudioContext` 合成，ffmpeg 限幅並校正到 −14 LUFS / −1.5 dBTP。

## 快速開始

```bash
cd films/02-black-and-white
npm install && npx playwright install chromium
npm run build && open dist/index.html     # 瀏覽器內播放、拖曳時間軸
tools/retake.sh e17                       # 改完某一段後重算該段與總片
```

詳細流程與每段微調方式見各影片資料夾的 README。

## 第三方

字型 Archivo、JetBrains Mono、Noto Sans CJK（SIL OFL）；物理引擎 matter.js（MIT）。
