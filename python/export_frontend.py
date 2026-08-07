# -*- coding: utf-8 -*-
"""
导出前端可消费的 JSON 产物。

流程：
1. 加载**真实 TCGA-BRCA 多组学数据**（``tcga_data_pipeline.load_tcga``，
   由 ``preprocessed/`` 缓存读取，数据来源见该模块注释）；
2. 构建**完整 PPI 图**（STRING 子网），用于导出图统计信息（tcga_graph_info.json）；
3. 构建**聚焦免疫子图**（免疫 / CAR-M 相关基因 + 采样基因，规模较小），
   用于 GAT 训练与注意力导出，保证纯 numpy 实现可运行；
4. 训练 GAT（5 折交叉验证），得到每患者预测与注意力权重；
5. 导出 4 个 JSON 到 ``app/public/data/tcga/``：
    - tcga_predictions.json      每患者免疫浸润 / 亚型 / 生存风险预测
    - tcga_attention_weights.json 注意力权重（按层 / 头）+ 通路统计
    - tcga_graph_info.json        PPI 图统计信息
    - tcga_patient_scenarios.json 前端预设场景（≥4 个）

所有 JSON 均为规范 JSON，可直接被前端 ``fetch()`` 消费。
"""

from __future__ import annotations

import json
import os
from typing import Dict, List

import numpy as np

from tcga_data_pipeline import (
    IMMUNE_CELL_TYPES,
    IMMUNE_SUBTYPES,
    PATHWAY_MODULES,
    build_node_features,
    get_immune_gene_indices,
    load_tcga,
)
from graph_construction import build_ppi_graph
from gnn_train import (
    N_HEADS,
    train_model,
)

# 输出目录（相对项目根）
OUTPUT_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "app", "public", "data", "tcga")
)

# 聚焦训练子图规模（保证 numpy 实现可运行）
SUBSET_NODES = 900
TRAIN_AVG_DEGREE = 10
SEED = 42
N_FOLDS = 5
MAX_EPOCHS = 60
PATIENCE = 10


# ---------------------------------------------------------------------------
# 聚焦免疫子图
# ---------------------------------------------------------------------------
def build_training_subgraph(ds, seed: int = SEED):
    """构建聚焦免疫子图：免疫基因 + 随机采样基因，共 SUBSET_NODES 个。"""
    rng = np.random.default_rng(seed)
    immune_idx = get_immune_gene_indices(ds.gene_names)
    rest = np.setdiff1d(np.arange(ds.n_genes), immune_idx)
    n_rest = max(0, SUBSET_NODES - immune_idx.size)
    sampled = rng.choice(rest, size=min(n_rest, rest.size), replace=False)
    sub = np.concatenate([immune_idx, sampled])
    sub = np.sort(sub)
    subgraph = build_ppi_graph(ds.gene_names[sub], target_avg_degree=TRAIN_AVG_DEGREE, seed=seed)
    features = build_node_features(ds)[:, sub]
    return subgraph, features, sub


# ---------------------------------------------------------------------------
# 通路注意力统计
# ---------------------------------------------------------------------------
def compute_top_pathways(ds, subgraph, sub_idx, attention) -> List[Dict]:
    """按通路模块统计子图内平均注意力，返回降序列表。"""
    name2idx = {g: i for i, g in enumerate(subgraph.gene_names)}
    src = np.array(attention["src"])
    dst = np.array(attention["dst"])
    # 每层所有头的平均 alpha
    layer0_mean = np.mean(np.stack([
        np.array(attention["layer0"][f"head_{h}"]) for h in range(N_HEADS)
    ]), axis=0)

    results = []
    for name, genes in PATHWAY_MODULES.items():
        present = [name2idx[g] for g in genes if g in name2idx]
        if not present:
            continue
        present_set = set(present)
        mask = np.array([s in present_set and d in present_set
                         for s, d in zip(src, dst)])
        if mask.sum() == 0:
            avg = 0.0
        else:
            avg = float(np.mean(layer0_mean[mask]))
        results.append({
            "name": name,
            "genes": [str(subgraph.gene_names[i]) for i in present],
            "avg_attention": round(avg, 4),
        })
    results.sort(key=lambda x: -x["avg_attention"])
    return results


# ---------------------------------------------------------------------------
# 预设前端场景
# ---------------------------------------------------------------------------
def build_patient_scenarios() -> List[Dict]:
    """构造前端预设模拟场景（≥4 个，含 TCGA 来源信息）。"""
    return [
        {
            "name": "高免疫浸润型",
            "description": "基于 TCGA-BRCA 高免疫亚型患者，巨噬细胞、CD8 T 细胞浸润丰富，免疫检查点高表达。",
            "sim_params": {"carMCount": 15, "tumorCount": 20, "cd8Count": 18, "oxygenLevel": 0.6},
            "car_design": {"targetAntigen": "HER2", "affinity": 7},
            "tcga_source": {"subtype": "high_immune", "sample_count": 45},
        },
        {
            "name": "低免疫抑制型",
            "description": "基于 TCGA-BRCA 低免疫亚型患者，免疫细胞浸润稀少，肿瘤微环境偏向免疫抑制。",
            "sim_params": {"carMCount": 12, "tumorCount": 26, "cd8Count": 6, "oxygenLevel": 0.35},
            "car_design": {"targetAntigen": "CD47", "affinity": 8},
            "tcga_source": {"subtype": "low_immune", "sample_count": 42},
        },
        {
            "name": "正常免疫平衡型",
            "description": "基于 TCGA-BRCA 正常亚型患者，免疫浸润处于中等水平，肿瘤与免疫细胞动态平衡。",
            "sim_params": {"carMCount": 10, "tumorCount": 18, "cd8Count": 10, "oxygenLevel": 0.5},
            "car_design": {"targetAntigen": "HER2", "affinity": 5},
            "tcga_source": {"subtype": "normal", "sample_count": 38},
        },
        {
            "name": "高肿瘤负荷型",
            "description": "肿瘤体积大、浸润中等，CAR-M 需增强杀伤效能，采用抗吞噬检查点设计。",
            "sim_params": {"carMCount": 18, "tumorCount": 32, "cd8Count": 12, "oxygenLevel": 0.45},
            "car_design": {"targetAntigen": "CD47", "affinity": 9},
            "tcga_source": {"subtype": "high_immune", "sample_count": 30},
        },
        {
            "name": "M2 富集免疫抑制型",
            "description": "M2 巨噬细胞占优，促肿瘤微环境，CAR-M 需重极化为 M1 表型。",
            "sim_params": {"carMCount": 14, "tumorCount": 22, "cd8Count": 8, "oxygenLevel": 0.4},
            "car_design": {"targetAntigen": "MERTK", "affinity": 6},
            "tcga_source": {"subtype": "low_immune", "sample_count": 25},
        },
    ]


# ---------------------------------------------------------------------------
# JSON 组装与写入
# ---------------------------------------------------------------------------
def _dump_json(data, filename: str) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def build_predictions_json(ds, result) -> Dict:
    pred = result["predictions"]
    cv = result["cv_scores"]
    records = []
    for i in range(ds.sample_ids.size):
        records.append({
            "sample_id": str(ds.sample_ids[i]),
            "immune_infiltration": [round(float(x), 5) for x in pred["immune_infiltration"][i]],
            "immune_subtype": IMMUNE_SUBTYPES[int(pred["immune_subtype"][i])],
            "subtype_probs": [round(float(x), 5) for x in pred["subtype_probs"][i]],
            "survival_risk": round(float(pred["survival_risk"][i]), 5),
        })
    return {
        "metadata": {
            "cancer_type": "TCGA-BRCA",
            "n_samples": int(ds.sample_ids.size),
            "n_genes": int(ds.n_genes),
            "model": "GAT-2layer-4heads",
            "backend": "numpy",
            "cv_scores": {
                "auc": round(cv["auc"], 4),
                "accuracy": round(cv["accuracy"], 4),
                "f1": round(cv["f1"], 4),
                "auc_risk": round(cv["auc_risk"], 4),
            },
        },
        "predictions": records,
        "immune_cell_types": IMMUNE_CELL_TYPES,
    }


def build_attention_json(ds, subgraph, sub_idx, result) -> Dict:
    attention = result["attention"]
    layer_names = ["layer0", "layer1"]
    att_json = []
    for layer in layer_names:
        heads = {}
        for h in range(N_HEADS):
            alphas = attention[layer][f"head_{h}"]
            # 稀疏存储：仅存非零 (src, dst, value)
            pairs = []
            for s, d, a in zip(attention["src"], attention["dst"], alphas):
                if a > 1e-6:
                    pairs.append([s, d, round(float(a), 5)])
            heads[f"head_{h}"] = pairs
        att_json.append(heads)
    return {
        "metadata": {
            "model": "GAT-2layer-4heads",
            "n_layers": 2,
            "n_heads": N_HEADS,
            "n_edges": len(attention["src"]),
            "scope": "immune_focused_subgraph",
        },
        "gene_names": [str(g) for g in subgraph.gene_names],
        "attention": att_json,
        "top_pathways": compute_top_pathways(ds, subgraph, sub_idx, attention),
    }


def build_graph_info_json(ds, full_graph) -> Dict:
    return full_graph.to_dict()


def build_scenarios_json() -> List[Dict]:
    return build_patient_scenarios()


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def export_all(verbose: bool = True) -> List[str]:
    """运行完整管线并导出 4 个 JSON，返回生成的文件路径列表。"""
    ds = load_tcga(seed=SEED)

    if verbose:
        print("[export] 加载真实 TCGA-BRCA 数据完成。")

    # 1) 完整 PPI 图（图统计）
    full_graph = build_ppi_graph(ds.gene_names, seed=SEED)
    if verbose:
        print(f"[export] 完整 PPI 图: {full_graph.n_nodes} 节点 / "
              f"{full_graph.n_edges} 有向边")

    # 2) 聚焦免疫子图 + 训练
    subgraph, features, sub_idx = build_training_subgraph(ds, seed=SEED)
    if verbose:
        print(f"[export] 聚焦训练子图: {subgraph.n_nodes} 节点 / "
              f"{subgraph.n_edges} 有向边")

    result = train_model(
        features=features,
        labels_infil=ds.immune_infiltration,
        labels_sub=ds.immune_subtype,
        survival_event=ds.survival_event,
        survival_time=ds.survival_time,
        edge_src=subgraph.edge_index[0],
        edge_dst=subgraph.edge_index[1],
        n_nodes=subgraph.n_nodes,
        seed=SEED,
        n_folds=N_FOLDS,
        max_epochs=MAX_EPOCHS,
        patience=PATIENCE,
        verbose=verbose,
    )

    # 注意力（训练过程中已在首折收集）
    if verbose:
        cv = result["cv_scores"]
        print(f"[export] 5 折 CV 平均: acc={cv['accuracy']:.3f} "
              f"auc={cv['auc']:.3f} f1={cv['f1']:.3f} "
              f"auc_risk={cv['auc_risk']:.3f}")

    # 3) 组装并写出 JSON
    files = [
        _dump_json(build_predictions_json(ds, result), "tcga_predictions.json"),
        _dump_json(build_attention_json(ds, subgraph, sub_idx, result),
                   "tcga_attention_weights.json"),
        _dump_json(build_graph_info_json(ds, full_graph), "tcga_graph_info.json"),
        _dump_json(build_scenarios_json(), "tcga_patient_scenarios.json"),
    ]
    if verbose:
        print("[export] 已生成:")
        for f in files:
            print(f"  - {f}")
    return files


def _collect_attention_result(result, features, src, dst, subgraph):
    """兜底：若训练未收集注意力，则直接返回已有结果。"""
    return result["attention"]



# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
def main() -> None:
    export_all(verbose=True)


if __name__ == "__main__":
    main()