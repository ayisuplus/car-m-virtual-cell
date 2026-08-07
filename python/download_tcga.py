# -*- coding: utf-8 -*-
"""
TCGA-BRCA 真实多组学数据下载脚本。

数据来源（2026-08 验证可用）：
- 表达 / CNV / 突变：cBioPortal REST API（TCGA PanCancer Atlas 2018，
  study=brca_tcga_pan_can_atlas_2018，GDC 数据，hg38）
- 临床：UCSC Xena GDC Hub（gdc-hub.s3.us-east-1.amazonaws.com）
- DNA 甲基化：UCSC Xena GDC Hub（methylation27，70 MB，探针级）

输出（缓存到 python/data_cache/）：
    TCGA-BRCA_expression.tsv    基因 x 样本 表达矩阵（RSEM，log2 样）
    TCGA-BRCA_cnv.tsv           基因 x 样本 GISTIC2 拷贝数（-2..2）
    TCGA-BRCA_mutation.tsv      基因 x 样本 突变 binary（0/1）
    TCGA-BRCA_methylation.tsv   探针 x 样本 甲基化 Beta 值
    TCGA-BRCA_clinical.tsv.gz   临床信息（Xena GDC 格式）
    dataset_info.json           数据版本与来源记录

用法：python download_tcga.py
下载一次后缓存，重复运行不重复下载。
"""

from __future__ import annotations

import gzip
import json
import os
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import requests

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_cache")

# cBioPortal API
CBIO_BASE = "https://www.cbioportal.org/api"
CBIO_STUDY = "brca_tcga_pan_can_atlas_2018"
CBIO_EXPR_PROFILE = f"{CBIO_STUDY}_rna_seq_v2_mrna"
CBIO_CNV_PROFILE = f"{CBIO_STUDY}_gistic"
CBIO_MUT_PROFILE = f"{CBIO_STUDY}_mutations"
CBIO_EXPR_SAMPLES = f"{CBIO_STUDY}_rna_seq_v2_mrna"
CBIO_CNV_SAMPLES = f"{CBIO_STUDY}_cna"
CBIO_MUT_SAMPLES = f"{CBIO_STUDY}_sequenced"

# UCSC Xena GDC Hub
XENA_HUB = "https://gdc.xenahubs.net/download"
XENA_CLINICAL = f"{XENA_HUB}/TCGA-BRCA.clinical.tsv.gz"
XENA_METHYLATION = f"{XENA_HUB}/TCGA-BRCA.methylation27.tsv.gz"

# 分批 fetch 的基因数（控制内存与网络）
FETCH_BATCH = 300
DOWNLOAD_TIMEOUT = 300
RETRIES = 3

HDRS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (CAR-M-project; data-pipeline)",
}


# ---------------------------------------------------------------------------
# HTTP 工具
# ---------------------------------------------------------------------------
def _get(url: str, timeout: int = 90, headers: Optional[Dict] = None) -> requests.Response:
    h = {**(HDRS if headers is None else headers)}
    last = None
    for i in range(RETRIES):
        try:
            r = requests.get(url, timeout=timeout, headers=h)
            if r.status_code == 200:
                return r
            last = f"{r.status_code} {r.text[:120]}"
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {e}"
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"GET failed {url}: {last}")


def _post(url: str, body: dict, timeout: int = 180) -> requests.Response:
    last = None
    for i in range(RETRIES):
        try:
            r = requests.post(url, data=json.dumps(body), timeout=timeout, headers=HDRS)
            if r.status_code == 200:
                return r
            if r.status_code != 200:
                last = f"{r.status_code} {r.text[:200]}"
        except Exception as e:  # noqa: BLE001
            last = f"{type(e).__name__}: {e}"
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"POST failed {url}: {last}")


def _download_file(url: str, dest: str, chunk_size: int = 1 << 20) -> bool:
    """流式下载文件到 dest，返回是否成功。支持断点续传。"""
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    tmp = dest + ".part"
    headers = {"User-Agent": HDRS["User-Agent"]}
    resume = os.path.getsize(tmp) if os.path.exists(tmp) else 0
    if resume:
        headers["Range"] = f"bytes={resume}-"
    for i in range(RETRIES):
        try:
            mode = "ab" if resume else "wb"
            with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT, headers=headers) as r:
                if r.status_code not in (200, 206):
                    raise RuntimeError(f"HTTP {r.status_code}")
                with open(tmp, mode) as f:
                    for chunk in r.iter_content(chunk_size):
                        if chunk:
                            f.write(chunk)
            os.replace(tmp, dest)
            return True
        except Exception:  # noqa: BLE001
            resume = os.path.getsize(tmp) if os.path.exists(tmp) else 0
            if resume:
                headers["Range"] = f"bytes={resume}-"
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"download failed {url}")


# ---------------------------------------------------------------------------
# cBioPortal：基因列表
# ---------------------------------------------------------------------------
def get_genes() -> List[Dict]:
    """获取 cBioPortal 全部基因（entrezGeneId + hugoGeneSymbol）。"""
    r = _get(f"{CBIO_BASE}/genes")
    return r.json()


# ---------------------------------------------------------------------------
# cBioPortal：分批 fetch 分子数据，构建基因 x 样本矩阵
# ---------------------------------------------------------------------------
def fetch_profile_matrix(
    profile_id: str,
    sample_list_id: str,
    genes: List[Dict],
    mode: str = "molecular",
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """按基因分批 fetch，返回 (矩阵, 基因符号, 样本ID)。

    mode="molecular" 用 molecular-data/fetch（表达、CNV，value=数值）
    mode="mutation"  用 mutations/fetch（MAF，构建 binary 矩阵）
    矩阵 shape = [n_genes_with_data, n_samples]
    """
    # 样本顺序
    samples = _get(f"{CBIO_BASE}/sample-lists/{sample_list_id}").json()["sampleIds"]
    n_samples = len(samples)
    sample2col = {s: c for c, s in enumerate(samples)}

    # 预分配全基因矩阵（gene_order 与 fetch 传入顺序一致）
    n_all = len(genes)
    mat = np.zeros((n_all, n_samples), dtype=np.float32)
    has_data = np.zeros(n_all, dtype=bool)

    if mode == "mutation":
        # 突变端点：molecular-profiles/{profile}/mutations/fetch
        url = f"{CBIO_BASE}/molecular-profiles/{profile_id}/mutations/fetch"
    else:
        # 表达/CNV 端点：molecular-profiles/{profile}/molecular-data/fetch
        url = f"{CBIO_BASE}/molecular-profiles/{profile_id}/{mode}-data/fetch"
    for start in range(0, n_all, FETCH_BATCH):
        entrez = [g["entrezGeneId"] for g in genes[start:start + FETCH_BATCH]]
        body = {"sampleListId": sample_list_id, "entrezGeneIds": entrez}
        r = _post(url, body)
        rows = r.json()
        if not rows:
            continue
        try:
            idx2gene = {i: start + j for j, i in enumerate(entrez)}
        except Exception:  # noqa: BLE001
            idx2gene = {}

        if mode == "mutation":
            # 每行是一个(样本,基因)突变；置 1
            for row in rows:
                eg = row.get("entrezGeneId")
                sid = row.get("sampleId")
                if eg in idx2gene and sid in sample2col:
                    mat[idx2gene[eg], sample2col[sid]] = 1.0
                    has_data[idx2gene[eg]] = True
        else:
            for row in rows:
                eg = row.get("entrezGeneId")
                sid = row.get("sampleId")
                if eg in idx2gene and sid in sample2col:
                    v = row.get("value")
                    if v is not None:
                        try:
                            mat[idx2gene[eg], sample2col[sid]] = float(v)
                            has_data[idx2gene[eg]] = True
                        except (TypeError, ValueError):
                            pass
        print(f"  [fetch] {profile_id} 批次 {start//FETCH_BATCH+1}/"
              f"{(n_all+FETCH_BATCH-1)//FETCH_BATCH} 累计有数据基因 "
              f"{int(has_data.sum())}", flush=True)

    keep = np.where(has_data)[0]
    symbols = np.array([genes[i]["hugoGeneSymbol"] for i in keep], dtype="<U32")
    return mat[keep], symbols, np.array(samples, dtype="<U32")


# ---------------------------------------------------------------------------
# 保存 TSV
# ---------------------------------------------------------------------------
def write_tsv(path: str, mat: np.ndarray, gene_names: np.ndarray,
              sample_ids: np.ndarray) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write("gene\t" + "\t".join(map(str, sample_ids)) + "\n")
        for i in range(mat.shape[0]):
            f.write(gene_names[i] + "\t" + "\t".join(
                f"{v:.4f}" for v in mat[i]) + "\n")


def write_tsv_int(path: str, mat: np.ndarray, gene_names: np.ndarray,
                  sample_ids: np.ndarray) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write("gene\t" + "\t".join(map(str, sample_ids)) + "\n")
        for i in range(mat.shape[0]):
            f.write(gene_names[i] + "\t" + "\t".join(
                f"{int(v):d}" for v in mat[i]) + "\n")


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def download_all() -> Dict:
    os.makedirs(CACHE_DIR, exist_ok=True)
    info: Dict = {"sources": {}, "n_samples": {}, "n_genes": {}}

    genes = get_genes()
    print(f"[gene] cBioPortal 基因总数: {len(genes)}")

    # ---- 表达 ----
    expr_file = os.path.join(CACHE_DIR, "TCGA-BRCA_expression.tsv")
    if os.path.exists(expr_file):
        print("[expr] 缓存已存在，跳过。")
    else:
        print("[expr] 下载表达矩阵（RSEM）...")
        mat, sym, samples = fetch_profile_matrix(
            CBIO_EXPR_PROFILE, CBIO_EXPR_SAMPLES, genes, "molecular")
        write_tsv(expr_file, mat, sym, samples)
        info["n_samples"]["expression"] = len(samples)
        info["n_genes"]["expression"] = len(sym)
        print(f"[expr] {len(sym)} 基因 x {len(samples)} 样本")

    # ---- CNV ----
    cnv_file = os.path.join(CACHE_DIR, "TCGA-BRCA_cnv.tsv")
    if os.path.exists(cnv_file):
        print("[cnv] 缓存已存在，跳过。")
    else:
        print("[cnv] 下载 GISTIC2 拷贝数矩阵（-2..2）...")
        mat, sym, samples = fetch_profile_matrix(
            CBIO_CNV_PROFILE, CBIO_CNV_SAMPLES, genes, "molecular")
        write_tsv_int(cnv_file, mat, sym, samples)
        info["n_samples"]["cnv"] = len(samples)
        info["n_genes"]["cnv"] = len(sym)
        print(f"[cnv] {len(sym)} 基因 x {len(samples)} 样本")

    # ---- 突变 ----
    mut_file = os.path.join(CACHE_DIR, "TCGA-BRCA_mutation.tsv")
    if os.path.exists(mut_file):
        print("[mut] 缓存已存在，跳过。")
    else:
        print("[mut] 下载突变数据（构建 binary 矩阵）...")
        mat, sym, samples = fetch_profile_matrix(
            CBIO_MUT_PROFILE, CBIO_MUT_SAMPLES, genes, "mutation")
        write_tsv_int(mut_file, mat, sym, samples)
        info["n_samples"]["mutation"] = len(samples)
        info["n_genes"]["mutation"] = len(sym)
        print(f"[mut] {len(sym)} 基因 x {len(samples)} 样本")

    # ---- 甲基化（Xena GDC Hub）----
    meth_file = os.path.join(CACHE_DIR, "TCGA-BRCA_methylation.tsv.gz")
    if os.path.exists(meth_file):
        print("[meth] 缓存已存在，跳过。")
    else:
        print("[meth] 下载甲基化 Beta 值矩阵（methylation27）...")
        _download_file(XENA_METHYLATION, meth_file)
        print("[meth] 下载完成。")

    # ---- 临床（Xena GDC Hub）----
    clin_file = os.path.join(CACHE_DIR, "TCGA-BRCA_clinical.tsv.gz")
    if os.path.exists(clin_file):
        print("[clin] 缓存已存在，跳过。")
    else:
        print("[clin] 下载临床数据...")
        _download_file(XENA_CLINICAL, clin_file)
        print("[clin] 下载完成。")

    # ---- 记录数据版本 ----
    info["data_version"] = {
        "expression": "cBioPortal PanCancer Atlas 2018 (GDC, hg38)",
        "cnv": "cBioPortal GISTIC2 PanCancer Atlas 2018",
        "mutation": "cBioPortal PanCancer Atlas 2018 (MAF)",
        "methylation": "UCSC Xena GDC Hub methylation27",
        "clinical": "UCSC Xena GDC Hub clinical",
        "note": "GDC Data Release 45.0 (2025-12-04) 为 cBioPortal 上游版本",
    }
    info_path = os.path.join(CACHE_DIR, "dataset_info.json")
    with open(info_path, "w", encoding="utf-8") as f:
        json.dump(info, f, ensure_ascii=False, indent=2)
    print("[info] 数据集版本已写入 dataset_info.json")
    return info


if __name__ == "__main__":
    download_all()