# 預告片（16:9）

約 53 秒、1920×1080、30 fps、150 BPM。畫面直接用影片本身的引擎和 72 個場景即時畫出來，不是剪既有的 MP4；配樂、音效與人聲全部由程式合成。

| 檔案 | 做什麼 |
|---|---|
| `plan.js` | 剪輯表：每個鏡頭從第幾拍開始、多長、用哪幾段、從段落的第幾秒開始播，以及人聲台詞與切片的位置 |
| `trailer.js` | 1920×1080 版面：單畫面、二／三分割、2×2、3×3、72 格拼貼、標題卡；拍點縮放、光圈、擦除、閃白、故障 |
| `music.js` | 配樂：F 小調、150 BPM；braam、四拍大鼓與側鏈、拍手、十六分 hi-hat、失真 reese 貝斯、supersaw 琶音、上升音、衝擊、轉場風聲 |
| `vo.py` | 人聲：espeak-ng 念台詞，經 28 頻帶聲碼器套到配樂的和弦上，再疊一軌降 5 個半音的原聲；切片做成有音高的人聲短打 |
| `mix.sh` | 人聲出現時配樂自動壓低（側鏈），響度校正到 −14 LUFS，與畫面合成 |

```bash
cd films/02-black-and-white
npm run build && node trailer/build.mjs
node trailer/render.mjs plan                 # 匯出 plan.json 給 vo.py
node trailer/render.mjs stills 20,400,900    # 預覽幾格 → trailer/build/sheet.jpg
node trailer/render.mjs music                # → trailer/build/music.wav
python3 trailer/vo.py                        # → trailer/build/vo.wav
node trailer/render.mjs video 0-1584 2       # 畫面（2 個 worker）
bash trailer/mix.sh                          # → trailer/build/BW-Motion_Trailer_16x9.mp4
```

要換鏡頭或節奏，只改 `plan.js`；畫面、配樂的段落與人聲位置都從這張表讀。
需要系統套件：`espeak-ng`（人聲）、ffmpeg；Python 需要 numpy、scipy、soundfile。
