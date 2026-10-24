# 提示詞合集分析

對 [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos)（MIT，commit 92aee2f，703 條）的分析腳本與結果，結論寫在 [07 提示詞實戰](../learning-map/07-prompt-practice.md)。

```bash
git clone https://github.com/yihui-dev/awesome-opus5-5-videos repo
python3 a1.py repo/data/videos.json              # 類別、技術標籤、長度分佈
python3 a2.py repo/data/videos.json cov.json     # 描述公式各欄的覆蓋率（中英關鍵字比對，近似值）
python3 a3.py repo/data/videos.json themes.json  # 題材叢集
```

`cov.json`、`themes.json` 是 2026-10-13 版本的輸出。
