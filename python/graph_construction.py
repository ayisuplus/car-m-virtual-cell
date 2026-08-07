# -*- coding: utf-8 -*-
"""
PPI（蛋白-蛋白互作）图构建 —— 基于真实 STRING 数据库子网。

本模块从 STRING 数据库（https://string-db.org）下载与输入基因列表相关的
高置信度 PPI 子网，替代原先的随机合成网络：

- 数据源: STRING REST API ``/api/tsv/network``（物种 9606 人类）
- 策略: 对输入基因分批请求（每批 1000），合并批次内互作边
- 过滤: combined_score >= 0.7（required_score=700）
- 缓存: 结果缓存到 ``python/data_cache/string_ppi.npz``，避免重复请求
- 回退: 若 STRING 不可用（网络受限），回退到带生物学偏好概率的合成图，
        保证下游 GNN 训练不中断

输出（图级信息，与合成版本一致）:
- ``edge_index``  : COO 稀疏格式 ``[2, num_edges]``（有向，含双向边）
- ``edge_weight`` : STRING 置信分数 ``[num_edges]``
- ``gene_names``  : 节点对应的基因名
- 图统计信息（节点数、边数、连通分量数、平均度、度分布）
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np

from tcga_data_pipeline import get_immune_gene_indices

_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(_DIR, "data_cache")
STRING_CACHE = os.path.join(CACHE_DIR, "string_ppi.npz")

# STRING 配置
STRING_API = "https://string-db.org/api/tsv/network"
STRING_SPECIES = 9606
STRING_SCORE = 700          # required_score（0.7）
STRING_BATCH = 300          # 每批基因数（STRING 上限 2000，但受 URL 长度限制，
                            # 5000 基因 * 8字符/基因 会触发 414，取 300 稳妥）
RETRIES = 3

# 回退合成图的期望平均度
TARGET_AVG_DEGREE = 24
SEED = 42

# 回退合成概率
P_IMMUNE_IMMUNE = 0.55
P_IMMUNE_OTHER = 0.012
P_OTHER_OTHER = 0.0018


@dataclass
class PPIGraph:
    """PPI 图数据结构。"""

    gene_names: np.ndarray                 # [n_nodes]  str
    edge_index: np.ndarray                 # [2, num_edges]  int64（有向）
    edge_weight: np.ndarray                # [num_edges]  float32
    n_nodes: int = 0
    n_edges: int = 0
    immune_indices: Optional[np.ndarray] = None
    source: str = "string"                 # 数据来源（string / synthetic）

    def __post_init__(self) -> None:
        if self.n_nodes == 0:
            self.n_nodes = int(self.gene_names.shape[0])
        if self.n_edges == 0:
            self.n_edges = int(self.edge_index.shape[1])

    # ---------------- 统计 ----------------
    def degree_distribution(self) -> Dict[str, float]:
        deg = np.bincount(self.edge_index[0], minlength=self.n_nodes).astype(float)
        return {
            "mean_degree": float(deg.mean()),
            "median_degree": float(np.median(deg)),
            "min_degree": int(deg.min()),
            "max_degree": int(deg.max()),
            "std_degree": float(deg.std()),
        }

    def connected_components(self) -> Tuple[int, int]:
        n = self.n_nodes
        parent = np.arange(n)
        ret = _union_find(self.edge_index, n)
        size = np.bincount(ret, minlength=n)
        comps = np.unique(ret)
        return int(comps.size), int(size.max())

    def to_dict(self) -> Dict:
        n_comp, max_comp = self.connected_components()
        return {
            "n_nodes": self.n_nodes,
            "n_edges": self.n_edges,
            "undirected_edges": self.n_edges // 2,
            "gene_names": [str(g) for g in self.gene_names],
            "node_features_dim": 4,
            "feature_names": [
                "mRNA_expression", "mutation", "CNV", "methylation",
            ],
            "connected_components": n_comp,
            "largest_component_size": int(max_comp),
            "degree_distribution": self.degree_distribution(),
            "n_immune_genes": int(self.immune_indices.size)
            if self.immune_indices is not None else 0,
            "source": self.source,
        }


def _union_find(edge_index: np.ndarray, n: int) -> np.ndarray:
    parent = np.arange(n)

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    src, dst = edge_index
    mask = src < dst
    for a, b in zip(src[mask], dst[mask]):
        union(int(a), int(b))
    return np.array([find(i) for i in range(n)])


# ---------------------------------------------------------------------------
# STRING 子网获取（带缓存）
# ---------------------------------------------------------------------------
def _fetch_string_chunk(gene_subset: List[str], required_score: int = STRING_SCORE):
    """请求 STRING network API 获取给定基因之间的互作边。"""
    import requests

    ids = "%0d".join(gene_subset)
    url = (f"{STRING_API}?identifiers={ids}&required_score={required_score}"
           f"&species={STRING_SPECIES}")
    last = None
    for _ in range(RETRIES):
        try:
            r = requests.get(url, timeout=120,
                             headers={"User-Agent": "CAR-M-project"})
            if r.status_code == 200:
                return r.text
            last = f"{r.status_code} {r.text[:100]}"
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {e}"
    raise RuntimeError(f"STRING 请求失败: {last}")


def _parse_string_edges(text: str) -> List[Tuple[str, str, float]]:
    """解析 STRING TSV，返回 (geneA, geneB, score) 无向边列表。"""
    edges = []
    lines = text.strip().splitlines()
    if not lines:
        return edges
    header = lines[0].split("\t")
    col_a = header.index("preferredName_A")
    col_b = header.index("preferredName_B")
    col_s = header.index("score")
    for ln in lines[1:]:
        parts = ln.split("\t")
        if len(parts) <= max(col_a, col_b, col_s):
            continue
        a = parts[col_a].strip()
        b = parts[col_b].strip()
        try:
            s = float(parts[col_s])
        except ValueError:
            continue
        if a and b and a != b:
            edges.append((a, b, s))
    return edges


def fetch_string_ppi(
    gene_names: np.ndarray,
    required_score: int = STRING_SCORE,
    batch: int = STRING_BATCH,
    use_cache: bool = True,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """获取 gene_names 子网的 STRING PPI 边（无向，去重）。

    返回 (geneA_idx, geneB_idx, score)；基因按 gene_names 下标。
    结果缓存到 data_cache/string_ppi.npz（按基因集哈希）。
    """
    import hashlib

    genes = list(gene_names)
    key = hashlib.md5("\n".join(sorted(set(genes))).encode()).hexdigest()[:16]
    cache_path = os.path.join(CACHE_DIR, f"string_ppi_{key}.npz")

    if use_cache and os.path.exists(cache_path):
        d = np.load(cache_path)
        return d["src"], d["dst"], d["weight"]

    # 分批请求
    edges: List[Tuple[str, str, float]] = []
    n = len(genes)
    for start in range(0, n, batch):
        chunk = genes[start:start + batch]
        text = _fetch_string_chunk(chunk, required_score)
        edges.extend(_parse_string_edges(text))
        print(f"  [string] 批次 {start//batch+1}/{(n+batch-1)//batch} "
              f"累计边 {len(edges)}", flush=True)

    # 映射到基因下标 + 去重
    name2idx = {g: i for i, g in enumerate(genes)}
    seen = set()
    src, dst, w = [], [], []
    for a, b, s in edges:
        if a in name2idx and b in name2idx:
            ia, ib = name2idx[a], name2idx[b]
            if ia == ib:
                continue
            lo, hi = (ia, ib) if ia < ib else (ib, ia)
            if (lo, hi) in seen:
                continue
            seen.add((lo, hi))
            src.append(lo)
            dst.append(hi)
            w.append(s)

    src = np.array(src, dtype=np.int64)
    dst = np.array(dst, dtype=np.int64)
    w = np.array(w, dtype=np.float32)
    if use_cache:
        np.savez_compressed(cache_path, src=src, dst=dst, weight=w)
    return src, dst, w


# ---------------------------------------------------------------------------
# 回退合成图（STRING 不可用时）
# ---------------------------------------------------------------------------
def _build_synthetic(
    gene_names: np.ndarray,
    target_avg_degree: int = TARGET_AVG_DEGREE,
    seed: int = SEED,
) -> PPIGraph:
    """带生物学偏好概率的合成 PPI 图（STRING 不可用时的回退）。"""
    rng = np.random.default_rng(seed)
    n = gene_names.size
    immune_idx = set(get_immune_gene_indices(gene_names).tolist())
    non_immune = np.array(sorted(set(range(n)) - immune_idx), dtype=np.int64)
    immune_arr = np.array(sorted(immune_idx), dtype=np.int64)
    target_undirected = (n * target_avg_degree) // 2

    undirected_pairs = []
    for ii in range(immune_arr.size):
        for jj in range(ii + 1, immune_arr.size):
            if rng.random() < P_IMMUNE_IMMUNE:
                undirected_pairs.append((int(immune_arr[ii]), int(immune_arr[jj])))
    existing = set(undirected_pairs)
    while len(undirected_pairs) < target_undirected and immune_arr.size and non_immune.size:
        a = int(rng.choice(gene_names.size))
        b = int(rng.choice(gene_names.size))
        if a == b:
            continue
        lo, hi = (a, b) if a < b else (b, a)
        if (lo, hi) in existing:
            continue
        undirected_pairs.append((lo, hi))
        existing.add((lo, hi))

    src = np.array([p[0] for p in undirected_pairs], dtype=np.int64)
    dst = np.array([p[1] for p in undirected_pairs], dtype=np.int64)
    edge_index = np.stack([np.concatenate([src, dst]), np.concatenate([dst, src])])
    weight = np.full(edge_index.shape[1], 0.7, dtype=np.float32)
    return PPIGraph(
        gene_names=gene_names,
        edge_index=edge_index,
        edge_weight=weight,
        n_nodes=n,
        n_edges=edge_index.shape[1],
        immune_indices=np.array(sorted(immune_idx), dtype=np.int64),
        source="synthetic",
    )


# ---------------------------------------------------------------------------
# 对外接口
# ---------------------------------------------------------------------------
def build_ppi_graph(
    gene_names: np.ndarray,
    target_avg_degree: int = TARGET_AVG_DEGREE,
    seed: int = SEED,
    use_string: bool = True,
) -> PPIGraph:
    """构建 PPI 图。

    优先使用真实 STRING 子网；若 STRING 不可用则回退合成图。
    ``target_avg_degree`` / ``seed`` 仅用于回退合成图。
    """
    n = gene_names.size
    if use_string:
        try:
            src, dst, weight = fetch_string_ppi(gene_names)
            if src.size:
                # 无向边 -> 双向有向边
                edge_index = np.stack(
                    [np.concatenate([src, dst]), np.concatenate([dst, src])])
                edge_weight = np.concatenate([weight, weight]).astype(np.float32)
                return PPIGraph(
                    gene_names=gene_names,
                    edge_index=edge_index,
                    edge_weight=edge_weight,
                    n_nodes=n,
                    n_edges=edge_index.shape[1],
                    immune_indices=get_immune_gene_indices(gene_names),
                    source="string",
                )
        except Exception as e:  # noqa: BLE001
            print(f"[graph] STRING 不可用，回退合成图: {type(e).__name__}: {e}")
    return _build_synthetic(gene_names, target_avg_degree, seed)


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
def main() -> None:
    from tcga_data_pipeline import load_tcga

    ds = load_tcga()
    graph = build_ppi_graph(ds.gene_names)
    stats = graph.to_dict()
    print(f"PPI 来源: {stats['source']}")
    print(f"节点数: {stats['n_nodes']}, 有向边数: {stats['n_edges']}, "
          f"无向边数: {stats['undirected_edges']}")
    print(f"连通分量: {stats['connected_components']}, "
          f"最大分量: {stats['largest_component_size']}")
    print(f"度分布: {stats['degree_distribution']}")
    print(f"免疫基因数: {stats['n_immune_genes']}")


if __name__ == "__main__":
    main()