# -*- coding: utf-8 -*-
"""
TCGA-BRCA 真实多组学数据加载与预处理。

本模块替代原先的合成数据生成，从 ``python/data_cache/`` 加载真实
TCGA-BRCA 多组学数据（由 ``download_tcga.py`` 下载并缓存），完成
质控、标准化、特征选择与样本匹配后，输出统一的 ``TCGADataset``，
供下游 PPI 图构建与 GNN 训练无缝消费。

数据来源（2026-08 验证可用）:
- mRNA 表达: cBioPortal PanCancer Atlas 2018（RSEM count，hg38）
- 突变:      cBioPortal PanCancer Atlas 2018（binary 0/1）
- CNV:       cBioPortal GISTIC2（-2..+2）
- DNA 甲基化: UCSC Xena GDC Hub methylation27（β 值，探针级）
- 临床:      UCSC Xena GDC Hub（生存 / 分期 / 年龄）
- 探针注释:   UCSC Xena probeMap（illuminaMethyl450_hg19_GPL16304_TCGAlegacy，
              27K 探针约 84.5% 可映射到基因）

预处理流程:
1. 加载 4 层原始数据；
2. mRNA: 过滤低表达基因 → log2(count+1) → 按基因 z-score；
3. 特征选择: 按表达方差取 top ``N_GENES`` 高变基因，其它层按同一基因集对齐；
4. methylation: 探针 → 基因（取多探针均值，β∈[0,1]）；
5. 样本匹配: 4 层样本 ID 取交集（统一到 TCGA-XX-XXXX-01 肿瘤样本）;
6. 免疫标签: 由免疫标志基因表达签名推导浸润比例与免疫亚型（代理标签）;
7. 生存标签: 从临床提取 OS 时间（月）与事件。

输出（缓存到 ``data_cache/preprocessed/``）:
- expression_matrix.npy / mutation_matrix.npy / cnv_matrix.npy / methylation_matrix.npy
- gene_names.npy / sample_ids.npy / clinical_data.pkl

下层接口（``load_tcga`` / ``build_node_features`` / ``get_immune_gene_indices``）
与原合成版本保持一致，保证 ``graph_construction.py``、``gnn_train.py``、
``export_frontend.py`` 无需改动即可消费真实数据。
"""

from __future__ import annotations

import os
import pickle
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# 常量
# ---------------------------------------------------------------------------
N_GENES = 5000              # 高变基因保留数（特征选择）
SEED = 42

# tcga_data_pipeline.py 所在目录的上层 data_cache
_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(_DIR, "data_cache")
PREPROC_DIR = os.path.join(CACHE_DIR, "preprocessed")

# 原始数据文件名
EXPR_FILE = "TCGA-BRCA_expression.tsv"
CNV_FILE = "TCGA-BRCA_cnv.tsv"
MUT_FILE = "TCGA-BRCA_mutation.tsv"
METH_FILE = "TCGA-BRCA_methylation450.tsv.gz"
CLIN_FILE = "TCGA-BRCA_clinical.tsv.gz"
PROBEMAP_FILE = "probeMap_methyl450.tsv"

# 低表达过滤阈值：基因在 >= 该比例样本中表达 > MIN_EXPR 才保留
MIN_EXPR_FRAC = 0.20
MIN_EXPR = 1.0

# CIBERSORT LM22 免疫细胞类型（22 维浸润向量的顺序）
IMMUNE_CELL_TYPES: List[str] = [
    "B_cells_naive",
    "B_cells_memory",
    "Plasma_cells",
    "T_cells_CD8",
    "T_cells_CD4_naive",
    "T_cells_CD4_memory_resting",
    "T_cells_CD4_memory_activated",
    "T_cells_follicular_helper",
    "T_cells_regulatory_Tregs",
    "T_cells_gamma_delta",
    "NK_cells_resting",
    "NK_cells_activated",
    "Monocytes",
    "Macrophages_M0",
    "Macrophages_M1",
    "Macrophages_M2",
    "Dendritic_cells_resting",
    "Dendritic_cells_activated",
    "Mast_cells_resting",
    "Mast_cells_activated",
    "Eosinophils",
    "Neutrophils",
]

# 免疫 / CAR-M 相关通路基因模块（与合成版本一致，用于免疫签名与 PPI 聚焦）
PATHWAY_MODULES: Dict[str, List[str]] = {
    "Phagocytosis_checkpoint": [
        "CD47", "SIRPA", "CD24", "SIGLEC10",
        "MERTK", "AXL", "TYRO3", "GAS6", "PROS1",
    ],
    "MHC-I_presentation": [
        "HLA-A", "HLA-B", "HLA-C", "B2M", "TAP1", "TAP2",
    ],
    "MHC-II_presentation": [
        "HLA-DRA", "HLA-DRB1", "HLA-DPB1", "CD74", "CIITA",
    ],
    "Macrophage_polarization": [
        "CD80", "CD86", "CD163", "MRC1", "IL10", "TGFB1", "CSF1R",
    ],
    "Immune_checkpoint": [
        "CD274", "PDCD1LG2", "CTLA4", "PDCD1", "LAG3", "HAVCR2", "TIGIT",
    ],
    "Tcell_recruitment": [
        "CCL2", "CCL5", "CXCL9", "CXCL10", "CX3CL1", "CXCR3",
    ],
    "NK_activation": [
        "NCR1", "NKG2D", "KLRD1", "ULBP1", "RAET1E",
    ],
}

# 补充的免疫 / 炎症相关基因
EXTRA_IMMUNE_GENES: List[str] = [
    "IFNG", "TNF", "IL12A", "IL12B", "IL6", "IL1B", "IL4", "IL13",
    "CCR7", "SELL", "SELE", "VCAM1", "ICAM1", "MYD88", "TLR4",
    "STAT1", "STAT3", "NFKB1", "IRF1", "IRF7", "JAK1", "JAK2",
    "CXCL11", "CXCL12", "CCL3", "CCL4", "CCL19", "CCL21",
    "GZMB", "PRF1", "IFIT1", "OAS1", "ISG15", "MX1",
]

# 完整免疫 / CAR-M 相关基因池
IMMUNE_GENE_POOL: List[str] = []
for _genes in PATHWAY_MODULES.values():
    for _g in _genes:
        if _g not in IMMUNE_GENE_POOL:
            IMMUNE_GENE_POOL.append(_g)
for _g in EXTRA_IMMUNE_GENES:
    if _g not in IMMUNE_GENE_POOL:
        IMMUNE_GENE_POOL.append(_g)

IMMUNE_SUBTYPES = ["high_immune", "low_immune", "normal"]

# 各组学层名称（与前端 feature_names 对应）
FEATURE_NAMES = ["mRNA_expression", "mutation", "CNV", "methylation"]

# 22 种免疫细胞类型的代表性标志基因（CIBERSORT LM22 精简版，用于从真实
# 表达谱推导免疫浸润比例作为代理标签）。每个类型取若干典型标志基因。
IMMUNE_CELL_MARKERS: Dict[str, List[str]] = {
    "B_cells_naive": ["CD19", "MS4A1", "CD79A"],
    "B_cells_memory": ["CD27", "BANK1", "CD80"],
    "Plasma_cells": ["MZB1", "XBP1", "SDC1", "TNFRSF17"],
    "T_cells_CD8": ["CD8A", "CD8B", "GZMB", "PRF1"],
    "T_cells_CD4_naive": ["CD4", "CCR7", "IL7R"],
    "T_cells_CD4_memory_resting": ["CD4", "CCR7", "SELL"],
    "T_cells_CD4_memory_activated": ["CD4", "ICOS", "CD27"],
    "T_cells_follicular_helper": ["CXCR5", "PDCD1", "ICOS", "BCL6"],
    "T_cells_regulatory_Tregs": ["FOXP3", "CTLA4", "IL2RA"],
    "T_cells_gamma_delta": ["TRDC", "TRGC1", "TRGC2"],
    "NK_cells_resting": ["NKG7", "KLRD1", "NCR1"],
    "NK_cells_activated": ["KLRD1", "KLRK1", "NCR1", "IFNG"],
    "Monocytes": ["CD14", "FCGR3A", "LYZ"],
    "Macrophages_M0": ["CD68", "CD163", "CSF1R"],
    "Macrophages_M1": ["IL1B", "TNF", "CXCL9", "NOS2"],
    "Macrophages_M2": ["MRC1", "CD163", "IL10", "TGFB1"],
    "Dendritic_cells_resting": ["ITGAX", "CD1C", "FLT3"],
    "Dendritic_cells_activated": ["ITGAX", "CD86", "CCR7", "CD80"],
    "Mast_cells_resting": ["TPSAB1", "TPSB2", "MS4A2"],
    "Mast_cells_activated": ["TPSAB1", "TPSB2", "MS4A2", "FCER1A"],
    "Eosinophils": ["CLC", "PRG2", "IL5RA"],
    "Neutrophils": ["FCGR3B", "CSF3R", "S100A8", "S100A9"],
}


# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------
def get_immune_gene_indices(gene_names: np.ndarray) -> np.ndarray:
    """返回免疫 / CAR-M 相关基因在 gene_names 中的下标（供 PPI / GNN 复用）。"""
    name2idx = {g: i for i, g in enumerate(gene_names)}
    idx = sorted(name2idx[g] for g in IMMUNE_GENE_POOL if g in name2idx)
    return np.array(idx, dtype=np.int64)


def _norm_sample_id(sid: str) -> str:
    """统一样本 ID 到 TCGA-XX-XXXX-01（患者 + 样本类型，15 字符）。

    说明：cBioPortal 样本为 ``TCGA-XX-XXXX-01``（15 字符），而 UCSC Xena
    的样本为 ``TCGA-XX-XXXX-01A``（16 字符，末尾为 vial 号 A/B/...）。
    为跨源对齐，统一截取前 15 字符（患者 + 样本类型），丢弃 vial 号。
    """
    s = str(sid).strip()
    if s.startswith("TCGA") and len(s) >= 15:
        return s[:15]
    return s


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------
@dataclass
class TCGADataset:
    """与真实 TCGA 多组学数据一致的统一数据集容器。"""

    sample_ids: np.ndarray                    # [n_samples]      str
    gene_names: np.ndarray                    # [n_genes]        str
    omics: Dict[str, np.ndarray]              # {layer: [n, g]}
    immune_infiltration: np.ndarray           # [n, 22]          比例（每行和为 1）
    immune_subtype: np.ndarray                # [n]              int（索引到 IMMUNE_SUBTYPES）
    survival_time: np.ndarray                 # [n]              float（月）
    survival_event: np.ndarray                # [n]              bool/0-1
    n_genes: int = N_GENES

    # ---------------- 持久化（npz 兼容，主要用 npy 缓存） ----------------
    def to_dict(self) -> Dict:
        return {
            "sample_ids": self.sample_ids,
            "gene_names": self.gene_names,
            "omics": self.omics,
            "immune_infiltration": self.immune_infiltration,
            "immune_subtype": self.immune_subtype,
            "survival_time": self.survival_time,
            "survival_event": self.survival_event.astype(np.int8),
        }

    def save(self, path: str) -> None:
        np.savez_compressed(path, **self.to_dict())

    @classmethod
    def load(cls, path: str) -> "TCGADataset":
        data = np.load(path, allow_pickle=False)
        return cls(
            sample_ids=data["sample_ids"],
            gene_names=data["gene_names"],
            omics={k: data[k] for k in FEATURE_NAMES},
            immune_infiltration=data["immune_infiltration"],
            immune_subtype=data["immune_subtype"].astype(np.int64),
            survival_time=data["survival_time"],
            survival_event=data["survival_event"].astype(np.bool_),
        )


# ---------------------------------------------------------------------------
# 数据加载与预处理
# ---------------------------------------------------------------------------
def _load_expression() -> pd.DataFrame:
    """加载表达矩阵（基因 x 样本），返回 DataFrame。"""
    path = os.path.join(CACHE_DIR, EXPR_FILE)
    df = pd.read_csv(path, sep="\t", index_col=0)
    df.index = [str(g) for g in df.index]
    df.columns = [_norm_sample_id(c) for c in df.columns]
    # 去重（同一基因多次出现取均值）
    df = df[~df.index.duplicated(keep="first")]
    # 去重样本列（防御性，同患者多 vial 归一化后合并）
    df = df.loc[:, ~df.columns.duplicated(keep="first")]
    return df


def _load_matrix(name: str, dtype: str = "float32") -> pd.DataFrame:
    """通用加载基因 x 样本矩阵（cnv / mutation）。"""
    path = os.path.join(CACHE_DIR, name)
    df = pd.read_csv(path, sep="\t", index_col=0)
    df.index = [str(g) for g in df.index]
    df.columns = [_norm_sample_id(c) for c in df.columns]
    df = df[~df.index.duplicated(keep="first")]
    df = df.loc[:, ~df.columns.duplicated(keep="first")]
    return df.astype(dtype)


def _load_methylation() -> pd.DataFrame:
    """加载甲基化矩阵（探针 x 样本，β 值），并映射探针 → 基因（取均值）。"""
    path = os.path.join(CACHE_DIR, METH_FILE)
    df = pd.read_csv(path, sep="\t", index_col=0, compression="gzip")
    df = df.apply(pd.to_numeric, errors="coerce")   # 缺失 -> NaN
    df.columns = [_norm_sample_id(c) for c in df.columns]

    # 去重样本列：同一患者多 vial（如 -01A / -01B）统一到 15 字符后合并，取首列
    df = df.loc[:, ~df.columns.duplicated(keep="first")]

    probes = df.index.astype(str)

    # 探针注释
    pm_path = os.path.join(CACHE_DIR, PROBEMAP_FILE)
    pm = pd.read_csv(pm_path, sep="\t", dtype=str, comment="#",
                     names=["id", "gene", "chrom", "start", "end", "strand"])
    pm = pm[(pm["gene"].notna()) & (pm["gene"].str.strip() != "") & (pm["gene"] != ".")]
    pm = pm[pm["id"].isin(set(probes))]
    pm = pm[~pm["id"].duplicated(keep="first")]

    # 将多基因探针（逗号分隔）只取第一个符号
    pm = pm.copy()
    pm["gene"] = pm["gene"].str.split(",").str[0].str.strip()

    # 映射并聚合：同一基因多探针取均值（skipna，避免单探针 NaN 抹掉整基因）
    df = df.loc[pm["id"].values]
    df = df.copy()
    df.index = pm["gene"].values
    df = df.groupby(level=0).mean()

    # 仍残留的 NaN（整个基因在所有样本缺失）用基因均值填补，再余下填 0
    df = df.fillna(df.mean(axis=0))
    df = df.fillna(0.0)
    return df


def _preprocess_expression(df: pd.DataFrame, n_genes: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """表达预处理：过滤低表达 → log2(count+1) → z-score → 方差选高变基因。

    返回 (gene_names[n_genes], 表达矩阵 [n_genes, n_samples], gene_names)。
    """
    mat = df.values.astype(np.float64)          # [n_genes, n_samples]
    gene_names = np.array(df.index, dtype="<U32")

    # 1) 过滤低表达：基因在 >= MIN_EXPR_FRAC 样本中表达 > MIN_EXPR
    expr_frac = (mat > MIN_EXPR).mean(axis=1)
    keep = expr_frac >= MIN_EXPR_FRAC
    mat = mat[keep]
    gene_names = gene_names[keep]

    # 2) log2(count+1)
    mat = np.log2(mat + 1.0)

    # 3) 按基因 z-score（沿样本轴标准化每个基因）
    mu = mat.mean(axis=1, keepdims=True)
    sd = mat.std(axis=1, keepdims=True) + 1e-8
    mat = (mat - mu) / sd

    # 4) 方差选 top n_genes 高变基因（沿基因轴计算方差）
    var = np.var(mat, axis=1)
    top = np.argsort(-var)[:n_genes]
    top = np.sort(top)
    mat = mat[top]                              # [n_genes, n_samples]
    gene_names = gene_names[top]
    return gene_names, mat, gene_names


def _align_layers(
    gene_names: np.ndarray,
    ref_expr: pd.DataFrame,
    cnv: pd.DataFrame,
    mut: pd.DataFrame,
    meth: pd.DataFrame,
) -> Dict[str, pd.DataFrame]:
    """按参考基因集对齐各层（缺失基因填 0），返回 {layer: samples x genes}。"""
    target = list(gene_names)
    out = {}
    # 表达
    out["mRNA_expression"] = ref_expr.loc[target].T
    out["CNV"] = _reindex_fill(cnv, target)
    out["mutation"] = _reindex_fill(mut, target)
    out["methylation"] = _reindex_fill(meth, target)
    return out


def _reindex_fill(df: pd.DataFrame, genes: List[str]) -> pd.DataFrame:
    """按 genes 重排列，缺失基因填 0，返回 [samples, genes]。

    只对存在于 ``df.index`` 的基因做 ``.loc`` 切片，缺失基因直接以
    0 值列补齐，避免 ``KeyError``，并保证返回列顺序与 ``genes`` 一致。
    """
    present = [g for g in genes if g in df.index]
    missing = [g for g in genes if g not in df.index]
    if present:
        sub = df.loc[present].T          # [samples, len(present)]，列序为 df 顺序
    else:
        sub = pd.DataFrame(index=df.columns)
    if missing:
        fill = pd.DataFrame(
            np.zeros((sub.shape[0], len(missing)), dtype=sub.values.dtype),
            index=sub.index, columns=missing)
        sub = pd.concat([sub, fill], axis=1)
    return sub[genes]


def _derive_immune_labels(
    expr: np.ndarray, gene_names: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    """从真实表达谱推导免疫浸润比例与免疫亚型（代理标签）。

    免疫浸润: 对每个免疫细胞类型取标志基因表达均值，Softmax 归一化为 22 维比例。
    免疫亚型: 按免疫基因表达签名评分三分位 -> high / low / normal。
    """
    name2idx = {g: i for i, g in enumerate(gene_names)}
    n = expr.shape[0]

    # 免疫基因签名评分（免疫 / CAR-M 相关基因表达均值）
    imm_gene_idx = get_immune_gene_indices(gene_names)
    if imm_gene_idx.size:
        score = expr[:, imm_gene_idx].mean(axis=1)
    else:
        score = expr.mean(axis=1)

    # 免疫浸润（22 维）
    infil = np.zeros((n, len(IMMUNE_CELL_TYPES)), dtype=np.float64)
    for j, cell in enumerate(IMMUNE_CELL_TYPES):
        markers = [name2idx[g] for g in IMMUNE_CELL_MARKERS[cell] if g in name2idx]
        if markers:
            infil[:, j] = expr[:, markers].mean(axis=1)
        else:
            infil[:, j] = score
    # 平移 + exp 软max，保证为正且和为 1
    infil = np.exp(infil - infil.max(axis=1, keepdims=True))
    infil = infil / infil.sum(axis=1, keepdims=True)

    # 免疫亚型：按免疫签名三分位
    q_lo, q_hi = np.quantile(score, [1 / 3, 2 / 3])
    subtype = np.where(
        score > q_hi, 0, np.where(score < q_lo, 1, 2)
    ).astype(np.int64)  # 0=high, 1=low, 2=normal
    return infil.astype(np.float32), subtype


def _load_clinical_survival() -> pd.DataFrame:
    """从临床数据提取生存信息，返回 index=sample_id 的 DataFrame。"""
    path = os.path.join(CACHE_DIR, CLIN_FILE)
    cli = pd.read_csv(path, sep="\t", low_memory=False)
    cli["sample_id"] = [_norm_sample_id(s) for s in cli.get("sample", cli.get("sample_id", ""))]
    cli = cli[cli["sample_id"].astype(str).str.startswith("TCGA")]

    vital = cli.get("vital_status.demographic", pd.Series(["Alive"] * len(cli)))
    days_death = pd.to_numeric(cli.get("days_to_death.demographic"), errors="coerce")
    days_follow = pd.to_numeric(cli.get("days_to_last_follow_up.diagnoses"), errors="coerce")

    # 可能一个患者多行（多标本），按 sample_id 聚合取首个
    cli = cli.copy()
    cli["vital"] = vital.fillna("Alive").astype(str).str.strip().str.lower()
    cli["dd"] = days_death
    cli["df"] = days_follow
    cli = cli.groupby("sample_id", as_index=True).first()

    death = cli["vital"].astype(str).isin(["dead", "deceased"])
    # 生存时间（月）：dead 用 days_to_death，alive 用 days_to_last_follow_up
    time_days = np.where(death, cli["dd"].fillna(0), cli["df"].fillna(0))
    time_days = np.maximum(0, time_days)
    surv_time = time_days / 30.44          # 月
    surv_time = np.clip(surv_time, 0.03, None)
    return pd.DataFrame({
        "survival_time": surv_time,
        "survival_event": death.astype(np.int8),
        "age": pd.to_numeric(cli.get("age_at_index.demographic"), errors="coerce"),
        "stage": cli.get("ajcc_pathologic_stage.diagnoses", ""),
    }, index=cli.index)


def preprocess_real_data(
    n_genes: int = N_GENES,
    cache_dir: Optional[str] = None,
    preproc_dir: Optional[str] = None,
) -> Dict:
    """主预处理流程：加载原始数据、质控、标准化、对齐、保存 npy/pkl。

    返回摘要 dict（样本数、基因数、缺失率等）。
    """
    global CACHE_DIR, PREPROC_DIR
    if cache_dir:
        CACHE_DIR = cache_dir
    if preproc_dir:
        PREPROC_DIR = preproc_dir
    os.makedirs(PREPROC_DIR, exist_ok=True)

    print("=== 加载原始数据 ===")
    expr = _load_expression()
    cnv = _load_matrix(CNV_FILE)
    mut = _load_matrix(MUT_FILE)
    meth = _load_methylation()
    print(f"  表达: {expr.shape[0]} 基因 x {expr.shape[1]} 样本")
    print(f"  CNV:  {cnv.shape[0]} 基因 x {cnv.shape[1]} 样本")
    print(f"  突变: {mut.shape[0]} 基因 x {mut.shape[1]} 样本")
    print(f"  甲基化: {meth.shape[0]} 基因 x {meth.shape[1]} 样本")

    # ---- 表达过滤 + 标准化 + 高变基因选择 ----
    print("=== 表达质控与标准化 ===")
    gene_names, expr_z, _ = _preprocess_expression(expr, n_genes)
    expr_pre = pd.DataFrame(expr_z, index=gene_names, columns=expr.columns)
    print(f"  过滤后高变基因: {gene_names.size}")

    # ---- 各层按参考基因集对齐 ----
    print("=== 层间基因对齐 ===")
    layers = _align_layers(gene_names, expr_pre, cnv, mut, meth)

    # ---- 样本匹配（4 层交集）----
    print("=== 样本匹配（交集） ===")
    # 各层 DataFrame 为 index=样本、columns=基因，样本交集取 index
    sample_sets = [set(df.index) for df in layers.values()]
    common = set.intersection(*sample_sets)
    common = sorted(common)
    print(f"  各层样本数: {[len(s) for s in sample_sets]}")
    print(f"  交集样本数: {len(common)}")
    if not common:
        raise RuntimeError("各层样本交集为空，无法继续。")

    arrays = {}
    for name in FEATURE_NAMES:
        m = layers[name].loc[common].astype(np.float32)
        arrays[name] = m.values

    # ---- 缺失率统计 ----
    missing_rate = {}
    for name in FEATURE_NAMES:
        m = arrays[name]
        # 甲基化缺失用 0 填充，其它层若为 0 视为真实低值；此处统计原始 NaN
        missing_rate[name] = float(np.isnan(m).mean())

    # ---- 免疫标签 + 生存标签 ----
    print("=== 标签推导 ===")
    expr_for_label = arrays["mRNA_expression"]
    infil, subtype = _derive_immune_labels(expr_for_label, gene_names)
    clin = _load_clinical_survival()
    clin = clin.loc[[s for s in common if s in clin.index]]
    surv_time = np.full(len(common), 0.03, dtype=np.float64)
    surv_event = np.zeros(len(common), dtype=bool)
    clin_map = {s: i for i, s in enumerate(common)}
    for sid, row in clin.iterrows():
        if sid in clin_map:
            surv_time[clin_map[sid]] = float(row["survival_time"])
            surv_event[clin_map[sid]] = bool(row["survival_event"])
    print(f"  有生存数据的样本: {clin.shape[0]} / {len(common)}")

    # ---- 保存 ----
    sample_ids = np.array(common, dtype="<U32")
    gene_names_arr = gene_names.astype("<U32")
    np.save(os.path.join(PREPROC_DIR, "expression_matrix.npy"), arrays["mRNA_expression"])
    np.save(os.path.join(PREPROC_DIR, "mutation_matrix.npy"), arrays["mutation"])
    np.save(os.path.join(PREPROC_DIR, "cnv_matrix.npy"), arrays["CNV"])
    np.save(os.path.join(PREPROC_DIR, "methylation_matrix.npy"), arrays["methylation"])
    np.save(os.path.join(PREPROC_DIR, "gene_names.npy"), gene_names_arr)
    np.save(os.path.join(PREPROC_DIR, "sample_ids.npy"), sample_ids)
    clinical_data = {
        "survival_time": surv_time,
        "survival_event": surv_event,
        "immune_infiltration": infil,
        "immune_subtype": subtype,
        "immune_cell_types": IMMUNE_CELL_TYPES,
        "immune_subtype_names": IMMUNE_SUBTYPES,
        "n_clinical_samples": clin.shape[0],
    }
    with open(os.path.join(PREPROC_DIR, "clinical_data.pkl"), "wb") as f:
        pickle.dump(clinical_data, f, protocol=4)

    summary = {
        "n_samples": len(common),
        "n_genes": int(gene_names.size),
        "n_samples_per_layer": {k: len(v) for k, v in zip(FEATURE_NAMES, sample_sets)},
        "missing_rate": missing_rate,
        "n_immune_subtype_high": int((subtype == 0).sum()),
        "n_immune_subtype_low": int((subtype == 1).sum()),
        "n_immune_subtype_normal": int((subtype == 2).sum()),
        "survival_event_rate": float(surv_event.mean()),
    }
    with open(os.path.join(PREPROC_DIR, "preprocess_summary.json"), "w", encoding="utf-8") as f:
        import json
        json.dump(summary, f, ensure_ascii=False, indent=2)
    return summary


# ---------------------------------------------------------------------------
# 对外接口
# ---------------------------------------------------------------------------
def _load_preprocessed(preproc_dir: Optional[str] = None) -> TCGADataset:
    """从 preprocessed 目录加载已保存的 npy / pkl。"""
    d = preproc_dir or PREPROC_DIR
    sample_ids = np.load(os.path.join(d, "sample_ids.npy"))
    gene_names = np.load(os.path.join(d, "gene_names.npy"))
    omics = {
        "mRNA_expression": np.load(os.path.join(d, "expression_matrix.npy")),
        "mutation": np.load(os.path.join(d, "mutation_matrix.npy")),
        "CNV": np.load(os.path.join(d, "cnv_matrix.npy")),
        "methylation": np.load(os.path.join(d, "methylation_matrix.npy")),
    }
    with open(os.path.join(d, "clinical_data.pkl"), "rb") as f:
        clin = pickle.load(f)
    return TCGADataset(
        sample_ids=sample_ids,
        gene_names=gene_names,
        omics=omics,
        immune_infiltration=clin["immune_infiltration"],
        immune_subtype=clin["immune_subtype"].astype(np.int64),
        survival_time=clin["survival_time"],
        survival_event=clin["survival_event"].astype(np.bool_),
        n_genes=int(gene_names.size),
    )


def load_tcga(
    n_samples: int = N_GENES,
    n_genes: int = N_GENES,
    seed: int = SEED,
    data_path: Optional[str] = None,
    preproc_dir: Optional[str] = None,
) -> TCGADataset:
    """加载真实 TCGA-BRCA 数据。

    若 ``preprocessed/`` 已有产物则直接加载；否则先执行真实数据预处理。
    ``n_samples`` / ``seed`` 参数仅为保持接口兼容（真实数据不使用）。
    """
    d = preproc_dir or PREPROC_DIR
    ready = all(os.path.exists(os.path.join(d, f)) for f in [
        "expression_matrix.npy", "mutation_matrix.npy", "cnv_matrix.npy",
        "methylation_matrix.npy", "gene_names.npy", "sample_ids.npy",
        "clinical_data.pkl",
    ])
    if not ready:
        preprocess_real_data(n_genes=n_genes, preproc_dir=d)
    return _load_preprocessed(d)


def build_node_features(ds: TCGADataset) -> np.ndarray:
    """把多组学展平为 GNN 节点特征 ``[n_samples, n_genes, 4]``。"""
    feat = np.stack(
        [ds.omics[name] for name in FEATURE_NAMES], axis=-1
    )  # [n, g, 4]
    for i in range(feat.shape[-1]):
        mu = feat[..., i].mean()
        sd = feat[..., i].std() + 1e-8
        feat[..., i] = (feat[..., i] - mu) / sd
    return feat.astype(np.float32)


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
def main() -> None:
    ds = load_tcga()
    layer = ds.omics["mRNA_expression"]
    n_samples = ds.sample_ids.size
    n_genes = ds.gene_names.size
    print(f"真实 TCGA-BRCA 数据: {n_samples} 样本 x {n_genes} 基因")
    print(f"组学层 shape: { {k: v.shape for k, v in ds.omics.items()} }")
    print(f"免疫亚型分布: {np.bincount(ds.immune_subtype)}")
    print(f"生存事件比例: {ds.survival_event.mean():.2f}")
    print(f"浸润比例每行和校验: {np.abs(ds.immune_infiltration.sum(1) - 1).max():.2e}")
    # 各层数值范围
    for name in FEATURE_NAMES:
        m = ds.omics[name]
        print(f"  {name}: min={m.min():.3f} max={m.max():.3f} mean={m.mean():.3f}")


if __name__ == "__main__":
    main()