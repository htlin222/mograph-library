# 物理參數表

做「擬真」的動態時，參數要從實測資料來，不能憑感覺調。這份表記錄影片裡用到的物理量、它們的出處，以及哪些是估計值。

## 原則

1. **先定比例尺**：畫面上的距離要對應到真實長度，重力才有意義。例如 e01 的落差是 600 px，代表 1.00 m，所以 `g = 9.81 × 600 = 5886 px/s²`。
2. **所有物體受同一個重力**：真空中，輕的和重的同時落地。質感的差異來自**恢復係數**（反彈）和**空氣阻力**，不是來自不同的 g。舊版 e01 給每顆球不同的 g，這是錯的。
3. **空氣阻力用二次式**：`a = −g − (g / v_t²) · v|v|`。只要知道終端速度 `v_t`，就不需要另外知道質量、截面積和阻力係數。
4. **恢復係數**：`e = √(反彈高度 ÷ 落下高度)`。它取決於「球 × 地面」這一組，不是球本身的屬性。
5. **動畫上的誇張要分開寫**：真實的接觸時間只有幾毫秒，在 30 fps 下看不到壓扁。壓扁與伸展屬於表演，不屬於物理，所以只能放在接觸點那一格，不能改變運動軌跡。

## 數值

| 物體 | 參數 | 值 | 出處 | 用在 |
|---|---|---|---|---|
| 重力 | g | 9.81 m/s² | 標準重力 | e01 |
| Super Ball × 花崗岩（25° 入射） | e | 0.78 | Cross, *Enhancing the bounce of a ball*（表 I） | e01 橡膠球 |
| 高爾夫球 × 花崗岩（25° 入射） | e | 0.87 | 同上 | — |
| 籃球（FIBA 規格） | 1.8 m 落下，反彈 1.2–1.4 m | e ≈ 0.82–0.88 | FIBA 規格（經 Topend Sports 轉引） | — |
| 網球（ITF） | 254 cm 落下，反彈 135–147 cm | e ≈ 0.73–0.76 | ITF 規格（經 Topend Sports 轉引） | — |
| 籃球，胎壓 14.7→27.7 psi | e | 0.41 → 0.87 | arXiv 2202.03034 | — |
| 網球，−22 °C → 80 °C | e | 0.45 → 0.81 | 同上 | — |
| 各種球 × 混凝土（92 cm 落下） | e | 高爾夫 0.86、撞球 0.80、手球 0.75、網球 0.71、玻璃彈珠 0.66、木球 0.60、鋼珠 0.60 | The Physics Factbook | — |
| 乳膠氣球（加一枚硬幣，總重 4.22 g，截面 0.0347 m²） | v_t | 1.875 m/s | 學生實驗（Hershberger） | 推算 |
| 一般派對氣球（約 3 g、直徑約 26 cm） | v_t | ≈ 1.3 m/s | 由上一列反推 C_d ≈ 0.57，代入 v_t = √(2mg ÷ ρC_dA)，ρ = 1.2 kg/m³ | e01 氣球 |
| 保齡球 × 地板 | e | ≈ 0.15 | **估計**，查無公開實測 | e01 保齡球 |
| 氣球 × 地板 | e | ≈ 0.5 | **估計** | e01 氣球 |

## 來源

- R. Cross, *Enhancing the bounce of a ball* — https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/48.%20EnhanceBounce.pdf
- *Modeling the bounce of a gas-filled ball*, arXiv:2202.03034 — https://arxiv.org/pdf/2202.03034
- Topend Sports, Coefficient of Restitution（FIBA、ITF 反彈規格） — https://topendsports.com/biomechanics/coefficient-of-restitution.htm
- ITF, Ball approval tests（254 cm 落下、花崗岩台面） — https://m.itftennis.com/media/2100/balls-ball-approval-tests.pdf
- The Physics Factbook, Coefficient of Restitution — https://hypertextbook.com/facts/2006/restitution.shtml
- Hershberger, terminal velocity of a balloon — https://tuhsphysics.ttsd.k12.or.us/Research/IB14/Hershberger

## 待補

- 保齡球掉在木地板或合成球道上的恢復係數（目前是估計值）
- 各種球的接觸時間（毫秒級）——用來決定動畫要誇張多少
- e13 剛體物理（matter.js）的摩擦、恢復係數、密度，應該對照這張表重新設定
