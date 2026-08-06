# 再生成论文图件与源数据（单点说明）

本目录的 PDF/PNG/SVG/TIFF 图件与 `source_data/` 下的 CSV 都是**生成产物**，
请勿手工编辑。按以下步骤可在新环境完整重建。

## 1. 准备 Python 环境

```bash
# 仓库根目录
python -m pip install -r requirements.txt
```

依赖仅四项：`numpy`、`matplotlib`、`Pillow`、`python-pptx`（见根目录
`requirements.txt`）。

## 2. 再生成顺序与命令

| 步骤 | 命令（仓库根目录） | 输入 | 输出 |
| --- | --- | --- | --- |
| ① 仿真轨迹 | `node scripts/run-trajectories-bundle.cjs` | `app/src/lib/simulation/` 引擎代码 | `paper/figures/data/trajectories.json` |
| ② 代理模型基准 | `node scripts/benchmark-surrogate.mjs` | neuralSurrogate + ODE 参考实现 | `paper/figures/data/benchmark_results.json` |
| ③ 源数据 CSV | `python paper/figures/export_source_data.py` | ① ② 的 JSON | `paper/figures/source_data/*.csv` |
| ④ 图件 | `python paper/figures/plot_all_figures.py` | ① ② 的 JSON | `paper/figures/figure1..4_*.{pdf,png,svg,tiff}` |

- 若 ③ 报 `benchmark_results.json not found`，先执行 ②。
- 所有仿真数据来自确定性引擎运行（seed=20250706），同参数同种子可复现。
- 演示 deck（pptx）由 `scripts/build_deck_v4.py` + `scripts/finalize_deck.py`
  生成，依赖 ④ 的图件输出。

## 3. 与 app 仿真输出的对应关系

- `trajectories.json` 由 `app/src/lib/simulation/engine.ts` 的确定性运行
  （`createSeededRandom`，seed=20250706）导出；场景包括 baseline、HER2_low、
  no_CD47_block、high_TGFb、CD147_ECM。
- Figure 2 的延迟数值来自 `scripts/benchmark-surrogate.mjs` 对
  `app/src/lib/simulation/neuralSurrogate.ts` 推理路径的实测（单机中位数，
  非生物学重复）。
- Figure 3/4 的时序与空间坐标逐点取自 ① 的轨迹（见 `source_data/` CSV，
  满足"每个数据点可溯源"的 QA 约定）。
- **一致性门禁**：若修改了 `app/src/lib/simulation/`（尤其权重矩阵方向、
  概率重标定），先在 `app/` 运行 `npm test`（含 `scripts/test-surrogate.mjs`
  一致性检查），再重新执行上表 ①→④，避免论文图件与仿真代码静默漂移。
