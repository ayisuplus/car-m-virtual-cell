# -*- coding: utf-8 -*-
"""
GNN（GAT）模型定义与训练。

模型 A：TCGA-GNN（图级分类 / 回归）
- 输入：PPI 图 + 患者多组学节点特征 [N_nodes, 4]
- 2 层 GAT（多头注意力，4 heads）
    - GATConv(in_features -> hidden, heads=4, concat=True)
    - GATConv(hidden*heads -> hidden2, heads=4, concat=True)
- 全局读出：对节点做 mean pooling -> 图表示
- 预测头：
    - 免疫浸润回归：Linear(hidden, 22) + softmax -> 22 维比例
    - 免疫亚型分类：Linear(hidden, 3)
    - 生存风险回归：Linear(hidden, 1) + sigmoid
- 损失：MSE(浸润) + CrossEntropy(亚型) + BCELogits(生存风险)
- 训练：5 折交叉验证，Adam lr=1e-3，max epochs，early stopping

**后端说明**：当前运行环境未安装 PyTorch / PyG，因此本模块已实现可独立
运行的**纯 numpy 手写 GAT**（含完整手动反向传播），保证无 GPU / 无 torch
环境下也能训练并产出权重与注意力结果。同时提供 ``torch_available()``
探测函数并为 torch 后端预留了扩展点：若环境安装 PyTorch，可按同一超参
数流程接入 torch 实现。

训练输出指标：每折 AUC、accuracy、F1；以及每层每头的注意力权重统计。
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# 超参数
# ---------------------------------------------------------------------------
SEED = 42
N_HEADS = 4
HIDDEN = 8          # 每头隐藏维度（numpy 版用小维度以保证可运行）
HIDDEN2 = 8
DROPOUT = 0.0
LR = 1e-3
MAX_EPOCHS = 100
PATIENCE = 12       # early stopping 耐心
N_FOLDS = 5
N_INFIL = 22        # 免疫浸润维度
N_SUBTYPE = 3       # 免疫亚型类别数
SLOPE = 0.2         # LeakyReLU 负斜率


# ---------------------------------------------------------------------------
# 后端探测
# ---------------------------------------------------------------------------
def torch_available() -> bool:
    """探测 PyTorch 是否可用。"""
    try:
        import torch  # noqa: F401
        return True
    except Exception:
        return False


# ===========================================================================
# 纯 numpy 手写 GAT（含手动反向传播）
# ===========================================================================

def _scatter_add(mat: np.ndarray, idx: np.ndarray, n: int) -> np.ndarray:
    """按 idx 对 mat 的行做累加，返回 [n, F]。用 bincount 实现（比
    np.add.at 快得多）。"""
    F = mat.shape[1]
    out = np.zeros((n, F), dtype=np.float64)
    for c in range(F):
        out[:, c] = np.bincount(idx, weights=mat[:, c], minlength=n)
    return out.astype(np.float32)


class NumPyGATLayer:
    """单层多头 GAT（numpy 实现，支持 forward / backward）。

    约定：edge_src 为“中心节点”，edge_dst 为“邻居节点”。聚合时
    ``new_h[i] = sum_{j in N(i)} alpha_ij * W h[j]``，其中 N(i) 为 i 的
    邻居集合（含自环，自环边在预处理阶段加入）。
    """

    def __init__(
        self,
        in_features: int,
        out_features: int,
        heads: int,
        n_nodes: int,
        slope: float = SLOPE,
        seed: int = SEED,
    ) -> None:
        rng = np.random.default_rng(seed)
        self.in_features = in_features
        self.out_features = out_features
        self.heads = heads
        self.n_nodes = n_nodes
        self.slope = slope
        # 每头独立的线性变换与注意力向量
        self.W = rng.normal(0.0, np.sqrt(2.0 / (in_features + out_features)),
                            (heads, in_features, out_features)).astype(np.float32)
        self.a = rng.normal(0.0, 0.1, (heads, 2 * out_features)).astype(np.float32)
        # Adam 状态
        self.m_W = np.zeros_like(self.W)
        self.v_W = np.zeros_like(self.W)
        self.m_a = np.zeros_like(self.a)
        self.v_a = np.zeros_like(self.a)

    def params(self) -> List[np.ndarray]:
        return [self.W, self.a]

    def forward(
        self, H: np.ndarray, src: np.ndarray, dst: np.ndarray
    ) -> Tuple[np.ndarray, dict]:
        """前向。H: [N, F_in]。返回 (out [N, heads*F_out], cache)。"""
        E = src.size
        outs = np.zeros((self.n_nodes, self.heads * self.out_features), dtype=np.float32)
        cache = {}
        for h in range(self.heads):
            Wh = H @ self.W[h]                       # [N, F_out]
            Whn = Wh[dst]                            # [E, F_out]
            Whc = Wh[src]
            concat = np.concatenate([Whn, Whc], axis=1)   # [E, 2F]
            logit = concat @ self.a[h]               # [E]
            e = np.where(logit > 0, logit, self.slope * logit)
            e = e - e.max()                          # 数值稳定
            exp = np.exp(e)
            S = np.bincount(src, weights=exp, minlength=self.n_nodes)  # [N]
            alpha = exp / (S[src] + 1e-12)           # [E]
            contrib = alpha[:, None] * Whn           # [E, F_out]
            new_h = _scatter_add(contrib, src, self.n_nodes)   # [N, F_out]
            outs[:, h * self.out_features: (h + 1) * self.out_features] = new_h
            cache[h] = dict(Wh=Wh, Whn=Whn, Whc=Whc, concat=concat,
                            e=e, exp=exp, S=S, alpha=alpha, logit=logit)
        cache["H"] = H
        cache["src"] = src
        cache["dst"] = dst
        return outs, cache

    def backward(
        self, d_out: np.ndarray, cache: dict
    ) -> np.ndarray:
        """反向。d_out: [N, heads*F_out]。返回 dH [N, F_in]。"""
        H = cache["H"]
        src = cache["src"]
        dst = cache["dst"]
        dH = np.zeros_like(H)
        for h in range(self.heads):
            c = cache[h]
            Wh, Whn, Whc = c["Wh"], c["Whn"], c["Whc"]
            concat, e, exp, S, alpha = c["concat"], c["e"], c["exp"], c["S"], c["alpha"]
            d_new = d_out[:, h * self.out_features: (h + 1) * self.out_features]
            # 1) 聚合反传
            dM = d_new[src]                       # [E, F_out]
            d_alpha = (dM * Whn).sum(axis=1)      # [E]
            dWhn = dM * alpha[:, None]            # [E, F_out]
            # 2) softmax 反传（按 center 分组）
            Sc = S[src]
            g = (exp * d_alpha) / (Sc + 1e-12)
            g_c = np.bincount(src, weights=g, minlength=self.n_nodes)
            d_logit = (exp / (Sc + 1e-12)) * (d_alpha - g_c[src])
            # 3) LeakyReLU 反传
            d_e = d_logit * np.where(e > 0, 1.0, self.slope)
            # 4) 注意力向量反传
            d_concat = d_e[:, None] * self.a[h]   # [E, 2F]
            dWhn += d_concat[:, :self.out_features]
            dWhc = d_concat[:, self.out_features:]
            da = concat.T @ d_e
            # 5) 线性反传（dW 需按邻居/中心节点的输入特征分别累加）
            dW = H[dst].T @ dWhn + H[src].T @ dWhc
            # 6) 输入反传
            dWh_total = _scatter_add(dWhn, dst, self.n_nodes)
            dWh_total += _scatter_add(dWhc, src, self.n_nodes)
            dH += dWh_total @ self.W[h].T
            # 记录梯度
            self.gW = dW
            self.ga = da
        return dH

    def adam_step(self, lr: float, t: int, beta1=0.9, beta2=0.999, eps=1e-8) -> None:
        for key, mkey, vkey, gkey, p in [
            ("W", "m_W", "v_W", "gW", self.W),
            ("a", "m_a", "v_a", "ga", self.a),
        ]:
            g = getattr(self, gkey)
            m = getattr(self, mkey)
            v = getattr(self, vkey)
            m[:] = beta1 * m + (1 - beta1) * g
            v[:] = beta2 * v + (1 - beta2) * g * g
            mhat = m / (1 - beta1 ** t)
            vhat = v / (1 - beta2 ** t)
            p[:] = p - lr * mhat / (np.sqrt(vhat) + eps)


class NumPyMLPHead:
    """图级预测头（numpy）。输入为 mean-pool 后的图表示。"""

    def __init__(self, in_dim: int, n_infil: int, n_subtype: int, seed: int = SEED) -> None:
        rng = np.random.default_rng(seed + 1)
        scale = np.sqrt(2.0 / in_dim)
        self.W_infil = rng.normal(0, scale, (in_dim, n_infil)).astype(np.float32)
        self.W_sub = rng.normal(0, scale, (in_dim, n_subtype)).astype(np.float32)
        self.W_risk = rng.normal(0, scale, (in_dim, 1)).astype(np.float32)
        self.b_sub = np.zeros(n_subtype, dtype=np.float32)
        for name in ("W_infil", "W_sub", "W_risk"):
            setattr(self, f"m_{name}", np.zeros_like(getattr(self, name)))
            setattr(self, f"v_{name}", np.zeros_like(getattr(self, name)))
        self.m_b_sub = np.zeros_like(self.b_sub)
        self.v_b_sub = np.zeros_like(self.b_sub)

    def forward(self, g: np.ndarray) -> Tuple[Dict[str, np.ndarray], dict]:
        infil_logits = g @ self.W_infil                      # [B, 22]
        infil = np.exp(infil_logits - infil_logits.max(1, keepdims=True))
        infil = infil / infil.sum(1, keepdims=True)
        sub_logits = g @ self.W_sub + self.b_sub             # [B, 3]
        sub = np.exp(sub_logits - sub_logits.max(1, keepdims=True))
        sub = sub / sub.sum(1, keepdims=True)
        risk_logits = (g @ self.W_risk).ravel()              # [B]
        risk = 1.0 / (1.0 + np.exp(-risk_logits))
        return (dict(infil=infil, infil_logits=infil_logits, sub=sub,
                      sub_logits=sub_logits, risk=risk, risk_logits=risk_logits,
                      g=g), dict())

    def backward(
        self, d_infil_logits: np.ndarray, d_sub_logits: np.ndarray,
        d_risk_logits: np.ndarray, g: np.ndarray,
    ) -> np.ndarray:
        """接收对 logits 的梯度（softmax/sigmoid 已处理），执行线性反传。

        返回 dg（对图表示 g 的梯度）。
        """
        dg = np.zeros_like(g)
        d_infil_logits = np.asarray(d_infil_logits, dtype=np.float32)
        d_sub_logits = np.asarray(d_sub_logits, dtype=np.float32)
        d_risk_logits = np.asarray(d_risk_logits, dtype=np.float32)
        dg += d_infil_logits @ self.W_infil.T
        self.gW_infil = g.T @ d_infil_logits
        dg += d_sub_logits @ self.W_sub.T
        self.gW_sub = g.T @ d_sub_logits
        self.gb_sub = d_sub_logits.sum(0)
        dg += d_risk_logits[:, None] @ self.W_risk.T
        self.gW_risk = g.T @ d_risk_logits[:, None]
        return dg

    def adam_step(self, lr: float, t: int, beta1=0.9, beta2=0.999, eps=1e-8) -> None:
        for name, p in [("W_infil", self.W_infil), ("W_sub", self.W_sub),
                        ("W_risk", self.W_risk)]:
            g = getattr(self, f"g{name}")
            m = getattr(self, f"m_{name}")
            v = getattr(self, f"v_{name}")
            m[:] = beta1 * m + (1 - beta1) * g
            v[:] = beta2 * v + (1 - beta2) * g * g
            p[:] = p - lr * (m / (1 - beta1 ** t)) / (np.sqrt(v / (1 - beta2 ** t)) + eps)
        g = self.gb_sub
        m = self.m_b_sub
        v = self.v_b_sub
        m[:] = beta1 * m + (1 - beta1) * g
        v[:] = beta2 * v + (1 - beta2) * g * g
        self.b_sub[:] = self.b_sub - lr * (m / (1 - beta1 ** t)) / (np.sqrt(v / (1 - beta2 ** t)) + eps)


class NumPyGAT:
    """两层多头 GAT + 图级预测头（端到端 numpy 实现）。"""

    def __init__(
        self,
        in_features: int,
        hidden: int,
        hidden2: int,
        heads: int,
        n_nodes: int,
        n_infil: int,
        n_subtype: int,
        seed: int = SEED,
    ) -> None:
        self.layer1 = NumPyGATLayer(in_features, hidden, heads, n_nodes, seed=seed)
        self.layer2 = NumPyGATLayer(hidden * heads, hidden2, heads, n_nodes, seed=seed + 2)
        self.head = NumPyMLPHead(hidden2 * heads, n_infil, n_subtype, seed=seed + 3)
        self.t = 0

    def forward(
        self, H: np.ndarray, src: np.ndarray, dst: np.ndarray
    ) -> Tuple[Dict[str, np.ndarray], dict, dict]:
        h1, c1 = self.layer1.forward(H, src, dst)
        h2, c2 = self.layer2.forward(h1, src, dst)
        g = h2.mean(axis=0)                        # [hidden2*heads] 图表示
        preds, _ = self.head.forward(g[None, :])
        self._last_preds = preds
        return preds, c1, c2

    def backward(
        self, d_infil_p, d_sub_logits, d_risk_logits, src, dst, c1, c2
    ) -> None:
        """d_infil_p 为对浸润 softmax 输出的梯度；d_sub_logits / d_risk_logits
        为对亚型 logits 与风险 logits 的梯度。"""
        preds = self._last_preds
        infil = preds["infil"][0]
        # 浸润用 MSE(softmax 输出)：软max雅可比变换
        g_infil = np.asarray(d_infil_p, dtype=np.float32)
        d_infil_logits = (infil * (g_infil - (g_infil * infil).sum()))[None, :]
        d_sub_logits = np.asarray(d_sub_logits, dtype=np.float32)[None, :]
        d_risk_logits = np.asarray(d_risk_logits, dtype=np.float32)[None]
        g = preds["g"][0]
        dg = self.head.backward(d_infil_logits, d_sub_logits, d_risk_logits,
                                g[None, :])[0]
        d_h2 = np.zeros_like(c2["H"])
        d_h2 += dg[None, :] / c2["H"].shape[0]     # mean-pool 反传
        d_h1 = self.layer2.backward(d_h2, c2)
        d_h0 = self.layer1.backward(d_h1, c1)

    def step(self, lr: float) -> None:
        self.t += 1
        self.layer1.adam_step(lr, self.t)
        self.layer2.adam_step(lr, self.t)
        self.head.adam_step(lr, self.t)


# ---------------------------------------------------------------------------
# 训练与评估
# ---------------------------------------------------------------------------
def _softmax(logits: np.ndarray) -> np.ndarray:
    z = logits - logits.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)


def _add_self_loops(src: np.ndarray, dst: np.ndarray, n: int) -> Tuple[np.ndarray, np.ndarray]:
    """为图添加自环边（GAT 需要）。"""
    self_loop = np.arange(n)
    return (np.concatenate([src, self_loop]), np.concatenate([dst, self_loop]))


def train_model(
    features: np.ndarray,          # [n_samples, n_nodes, F_in]
    labels_infil: np.ndarray,      # [n_samples, 22]
    labels_sub: np.ndarray,        # [n_samples]
    survival_event: np.ndarray,    # [n_samples] bool
    survival_time: np.ndarray,     # [n_samples]
    edge_src: np.ndarray,
    edge_dst: np.ndarray,
    n_nodes: int,
    seed: int = SEED,
    n_folds: int = N_FOLDS,
    max_epochs: int = MAX_EPOCHS,
    patience: int = PATIENCE,
    lr: float = LR,
    verbose: bool = True,
) -> Dict:
    """训练 5 折 CV 的 GAT 模型并返回预测与指标。

    返回 dict 包含：
      - predictions : 每样本预测（浸润、亚型、风险）
      - cv_scores   : 各折 / 平均的 AUC、accuracy、F1
      - attention   : 每层每头的注意力权重统计
    """
    rng = np.random.default_rng(seed)
    n = features.shape[0]

    # 生存风险标签：用事件 + 时间构造二元风险（高于中位时间且事件=1 为高风险）
    risk_label = survival_event.astype(np.float32) * (survival_time > np.median(survival_time))
    risk_label = risk_label.astype(np.float32)

    # 交叉验证分割
    idx = np.arange(n)
    fold_size = n // n_folds
    folds = []
    for f in range(n_folds):
        start = f * fold_size
        end = n if f == n_folds - 1 else (f + 1) * fold_size
        val = idx[start:end]
        tr = np.concatenate([idx[:start], idx[end:]])
        folds.append((tr, val))

    all_preds = np.zeros((n, N_INFIL), dtype=np.float32)
    all_sub_probs = np.zeros((n, N_SUBTYPE), dtype=np.float32)
    all_risk = np.zeros(n, dtype=np.float32)
    cv_scores = []
    attention_agg = None

    for f, (tr, val) in enumerate(folds):
        model = NumPyGAT(
            in_features=features.shape[-1], hidden=HIDDEN, hidden2=HIDDEN2,
            heads=N_HEADS, n_nodes=n_nodes, n_infil=N_INFIL,
            n_subtype=N_SUBTYPE, seed=seed + f,
        )
        src = np.array(edge_src, dtype=np.int64)
        dst = np.array(edge_dst, dtype=np.int64)
        src, dst = _add_self_loops(src, dst, n_nodes)

        best_val = -np.inf
        best_state = None
        patience_count = 0

        for epoch in range(max_epochs):
            # ---- 训练 ----
            for i in tr:
                H = features[i]
                preds, c1, c2 = model.forward(H, src, dst)

                # 损失梯度（相对于各输出）
                infil = preds["infil"][0]
                d_infil_p = 2.0 * (infil - labels_infil[i]) / max(infil.size, 1)
                sub_logits = preds["sub_logits"][0]
                sub_prob = preds["sub"][0]
                d_sub_logits = sub_prob.copy()
                d_sub_logits[labels_sub[i]] -= 1.0
                d_risk_logits = preds["risk"][0] - risk_label[i]

                model.backward(d_infil_p, d_sub_logits, d_risk_logits, src, dst, c1, c2)
                model.step(lr)

            # ---- 验证 / 早停 ----
            val_preds, val_sub, val_risk = _predict_loop(model, features, val, src, dst)
            val_acc = (val_sub.argmax(1) == labels_sub[val]).mean()
            val_loss = _compute_loss(val_preds, labels_infil[val],
                                     val_sub, labels_sub[val], val_risk, risk_label[val])
            score = -val_loss
            if score > best_val:
                best_val = score
                best_state = _clone_state(model)
                patience_count = 0
            else:
                patience_count += 1
                if patience_count >= patience:
                    break

        # 恢复最佳状态
        _restore_state(model, best_state)

        # 折叠内预测
        p, s, r = _predict_loop(model, features, val, src, dst)
        all_preds[val] = p
        all_sub_probs[val] = s
        all_risk[val] = r

        # 折叠指标
        scores = _evaluate(p, s, labels_infil[val], labels_sub[val],
                           r, risk_label[val], survival_event[val], survival_time[val])
        cv_scores.append(scores)

        # 注意力聚合（取首折的验证子集均值）
        if f == 0:
            attention_agg = _collect_attention(model, features, val[:16], src, dst)

        if verbose:
            print(f"  [fold {f}] sub_acc={scores['accuracy']:.3f} "
                  f"auc={scores['auc']:.3f} f1={scores['f1']:.3f} "
                  f"best_epoch_baseline")

    avg_scores = _average_scores(cv_scores)
    return {
        "predictions": {
            "immune_infiltration": all_preds,
            "immune_subtype": all_sub_probs.argmax(1),
            "subtype_probs": all_sub_probs,
            "survival_risk": all_risk,
        },
        "cv_scores": avg_scores,
        "cv_scores_per_fold": cv_scores,
        "attention": attention_agg,
    }


def _predict_loop(model, features, idx, src, dst):
    p = np.zeros((len(idx), N_INFIL), dtype=np.float32)
    s = np.zeros((len(idx), N_SUBTYPE), dtype=np.float32)
    r = np.zeros(len(idx), dtype=np.float32)
    for j, i in enumerate(idx):
        preds, _, _ = model.forward(features[i], src, dst)
        p[j] = preds["infil"][0]
        s[j] = preds["sub"][0]
        r[j] = preds["risk"][0]
    return p, s, r


def _compute_loss(p, y_infil, s, y_sub, r, y_risk):
    mse = np.mean((p - y_infil) ** 2)
    ce = -np.log(s[np.arange(len(y_sub)), y_sub] + 1e-12).mean()
    bce = np.mean(-(y_risk * np.log(r + 1e-12) + (1 - y_risk) * np.log(1 - r + 1e-12)))
    return mse + ce + bce


def _clone_state(model: NumPyGAT) -> dict:
    state = {}
    for layer_name in ("layer1", "layer2"):
        layer = getattr(model, layer_name)
        state[layer_name] = {
            "W": layer.W.copy(), "a": layer.a.copy(),
            "m_W": layer.m_W.copy(), "v_W": layer.v_W.copy(),
            "m_a": layer.m_a.copy(), "v_a": layer.v_a.copy(),
        }
    head = model.head
    state["head"] = {
        "W_infil": head.W_infil.copy(), "W_sub": head.W_sub.copy(),
        "W_risk": head.W_risk.copy(), "b_sub": head.b_sub.copy(),
        "m_W_infil": head.m_W_infil.copy(), "v_W_infil": head.v_W_infil.copy(),
        "m_W_sub": head.m_W_sub.copy(), "v_W_sub": head.v_W_sub.copy(),
        "m_W_risk": head.m_W_risk.copy(), "v_W_risk": head.v_W_risk.copy(),
        "m_b_sub": head.m_b_sub.copy(), "v_b_sub": head.v_b_sub.copy(),
    }
    return state


def _restore_state(model: NumPyGAT, state: dict) -> None:
    for layer_name in ("layer1", "layer2"):
        layer = getattr(model, layer_name)
        s = state[layer_name]
        layer.W[:] = s["W"]; layer.a[:] = s["a"]
        layer.m_W[:] = s["m_W"]; layer.v_W[:] = s["v_W"]
        layer.m_a[:] = s["m_a"]; layer.v_a[:] = s["v_a"]
    head = model.head
    s = state["head"]
    head.W_infil[:] = s["W_infil"]; head.W_sub[:] = s["W_sub"]
    head.W_risk[:] = s["W_risk"]; head.b_sub[:] = s["b_sub"]
    head.m_W_infil[:] = s["m_W_infil"]; head.v_W_infil[:] = s["v_W_infil"]
    head.m_W_sub[:] = s["m_W_sub"]; head.v_W_sub[:] = s["v_W_sub"]
    head.m_W_risk[:] = s["m_W_risk"]; head.v_W_risk[:] = s["v_W_risk"]
    head.m_b_sub[:] = s["m_b_sub"]; head.v_b_sub[:] = s["v_b_sub"]


def _evaluate(p, s, y_infil, y_sub, r, y_risk, ev, t):
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    sub_pred = s.argmax(1)
    acc = float(accuracy_score(y_sub, sub_pred))
    f1 = float(f1_score(y_sub, sub_pred, average="macro", zero_division=0))
    # AUC：亚型为三分类，计算多类 OvR AUC；风险为二分类 AUC
    try:
        auc_sub = float(roc_auc_score(y_sub, s, multi_class="ovr", average="macro"))
    except Exception:
        auc_sub = 0.5
    try:
        auc_risk = float(roc_auc_score(y_risk, r))
    except Exception:
        auc_risk = 0.5
    return {"accuracy": acc, "f1": f1, "auc": auc_sub, "auc_risk": auc_risk}


def _average_scores(cv_scores):
    agg = {}
    for k in cv_scores[0]:
        agg[k] = float(np.mean([s[k] for s in cv_scores]))
        agg[k + "_std"] = float(np.std([s[k] for s in cv_scores]))
    return agg


def _collect_attention(model, features, idx, src, dst, n_immune=None):
    """收集验证子集上每层每头的注意力系数（按边对齐，多个样本取均值）。

    返回结构：
    {
      "src": [..], "dst": [..],
      "layer0": {"head_0": [alpha...], "head_1": [..], ...},
      "layer1": {"head_0": [..], ...},
    }
    """
    E = src.size
    alpha_l1 = [np.zeros(E, dtype=np.float32) for _ in range(N_HEADS)]
    alpha_l2 = [np.zeros(E, dtype=np.float32) for _ in range(N_HEADS)]
    for i in idx:
        H = features[i]
        h1, c1 = model.layer1.forward(H, src, dst)
        h2, c2 = model.layer2.forward(h1, src, dst)
        for h in range(N_HEADS):
            alpha_l1[h] += c1[h]["alpha"]
            alpha_l2[h] += c2[h]["alpha"]
    n = max(len(idx), 1)
    layer0 = {f"head_{h}": (alpha_l1[h] / n).tolist() for h in range(N_HEADS)}
    layer1 = {f"head_{h}": (alpha_l2[h] / n).tolist() for h in range(N_HEADS)}
    return {
        "src": src.astype(int).tolist(),
        "dst": dst.astype(int).tolist(),
        "layer0": layer0,
        "layer1": layer1,
    }


# ---------------------------------------------------------------------------
# 统一训练入口（供 export_frontend 调用）
# ---------------------------------------------------------------------------
def run_training(
    features: np.ndarray,
    dataset,          # TCGADataset
    graph,            # PPIGraph
    verbose: bool = True,
) -> Dict:
    """在 numpy 后端上运行 5 折 CV 训练并返回完整结果。"""
    t0 = time.time()
    if verbose:
        print(f"[gnn_train] 后端: numpy 手写 GAT (torch 不可用: {not torch_available()})")
        print(f"[gnn_train] 图: {graph.n_nodes} 节点 / {graph.n_edges} 有向边")
    result = train_model(
        features=features,
        labels_infil=dataset.immune_infiltration,
        labels_sub=dataset.immune_subtype,
        survival_event=dataset.survival_event,
        survival_time=dataset.survival_time,
        edge_src=graph.edge_index[0],
        edge_dst=graph.edge_index[1],
        n_nodes=graph.n_nodes,
        verbose=verbose,
    )
    result["elapsed_sec"] = time.time() - t0
    return result


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------
def main() -> None:
    from tcga_data_pipeline import load_tcga, build_node_features
    from graph_construction import build_ppi_graph

    ds = load_tcga()
    graph = build_ppi_graph(ds.gene_names)
    features = build_node_features(ds)
    res = run_training(features, ds, graph)
    print("\n=== 5 折 CV 平均指标 ===")
    for k, v in res["cv_scores"].items():
        print(f"  {k}: {v:.4f}")


if __name__ == "__main__":
    main()