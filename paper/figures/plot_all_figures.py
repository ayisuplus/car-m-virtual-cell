#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAR-M Simulator — Submission-grade figures (Nature-style, Python backend).

Follows nature-figure skill v2.1 protocol:
  - svg.fonttype='none', pdf.fonttype=42 (editable text)
  - Arial 7pt base, white background
  - add_panel_label(a/b/c) at (-0.08, 1.05)
  - Unified DEFAULT_COLORS palette per figure
  - 600 dpi SVG + PDF + TIFF exports
  - Figure legends in paper markdown follow: Fig. N | **title** + a/b/c + stats + Source Data

Figure set (four-point contract):
  Fig 1 — System architecture (schematic-led composite)
  Fig 2 — Surrogate performance (quantitative: bar + scaling curve)
  Fig 3 — Mechanistic trends (quantitative grid: 2x2 real engine trajectories)
  Fig 4 — Spatial TME snapshot (image-plate + quant: scatter panels)

All data from deterministic engine runs (seed=20250706) or shipped benchmark.
"""
import json, os
import numpy as np

import matplotlib as mpl
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import matplotlib.patches as mpatches

# ============================================================
# NATURE-FIGURE MANDATORY: editable text in vector output
# ============================================================
mpl.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans", "sans-serif"],
    "svg.fonttype": "none",
    "pdf.fonttype": 42,
    "font.size": 7,
    "axes.spines.right": False,
    "axes.spines.top": False,
    "axes.linewidth": 0.8,
    "legend.frameon": False,
    "axes.labelsize": 7,
    "xtick.labelsize": 6,
    "ytick.labelsize": 6,
    "legend.fontsize": 6,
    "xtick.major.width": 0.6,
    "ytick.major.width": 0.6,
    "xtick.major.size": 2.5,
    "ytick.major.size": 2.5,
    "lines.linewidth": 1.2,
    "lines.markersize": 3,
})

# ============================================================
# PALETTE (nature-figure api.md DEFAULT_COLORS)
# ============================================================
PALETTE = {
    "blue_main": "#0F4D92", "blue_secondary": "#3775BA",
    "green_1": "#DDF3DE", "green_2": "#AADCA9", "green_3": "#8BCF8B",
    "red_1": "#F6CFCB", "red_2": "#E9A6A1", "red_strong": "#B64342",
    "neutral_light": "#CFCECE", "neutral_mid": "#767676",
    "neutral_dark": "#4D4D4D", "neutral_black": "#272727",
    "gold": "#FFD700", "teal": "#42949E",
    "violet": "#9A4D8E", "magenta": "#EA84DD",
}
DC = [PALETTE["blue_main"], PALETTE["green_3"], PALETTE["red_strong"],
      PALETTE["teal"], PALETTE["violet"], PALETTE["neutral_light"]]


def add_panel_label(ax, label, x=-0.08, y=1.05, fontsize=9,
                    color='black', fontweight='bold'):
    ax.text(x, y, label, transform=ax.transAxes, fontsize=fontsize,
            fontweight=fontweight, color=color, ha='left', va='bottom')


def save_pub(fig, filename, dpi=600):
    """Nature-figure standard: SVG (primary) + PDF + TIFF at 600 dpi."""
    os.makedirs(os.path.dirname(filename) or '.', exist_ok=True)
    fig.tight_layout(pad=0.8)
    fig.savefig(f"{filename}.svg", bbox_inches="tight")
    fig.savefig(f"{filename}.pdf", bbox_inches="tight")
    fig.savefig(f"{filename}.tiff", dpi=dpi, bbox_inches="tight",
                pil_kwargs={"compression": "tiff_lzw"})
    fig.savefig(f"{filename}.png", dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {os.path.basename(filename)}.{{svg,pdf,tiff,png}}")


# ============================================================
# Load trajectory data
# ============================================================
BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, 'data', 'trajectories.json')) as f:
    TRAJS = json.load(f)


def get_series(name):
    for s in TRAJS:
        if s['name'] == name:
            return s['statistics'][-1], s['cellPositions']
    return None, None


# ============================================================
# FIGURE 1 — System architecture (schematic-led composite)
# ============================================================
def plot_fig1():
    # ---- Figure contract (nature-figure) ----------------------------------
    # Core conclusion: CAR-M Simulator fuses single-cell/literature priors, a
    #   neural polarization surrogate, a spatial ABM + reaction-diffusion TME
    #   model, and a client-side workbench into one real-time, reproducible,
    #   interactive system (the surrogate is the interactivity enabler = hero).
    # Archetype: schematic-led composite (single overview schematic).
    # Backend: python (exclusive). White ground, Arial, editable vector text.
    # Export: svg + pdf + tiff@600 + png. Visual vocabulary (layer hues) is
    #   defined here and reused consistently; accent (gold) reserved for hero.
    fig, ax = plt.subplots(figsize=(7.2, 4.6))
    fig.patch.set_facecolor('white')
    ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis('off')

    ND = PALETTE['neutral_dark']; NM = PALETTE['neutral_mid']; NL = PALETTE['neutral_light']

    def rbox(x, y, w, h, fc, ec, lw=0.8, alpha=1.0, z=1, pad=1.0):
        p = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad={pad}",
                           facecolor=fc, edgecolor=ec, linewidth=lw,
                           alpha=alpha, zorder=z)
        ax.add_patch(p); return p

    def chip(x, y, w, h, txt, fs=5.0):
        rbox(x, y, w, h, 'white', NM, lw=0.5, z=2, pad=0.7)
        ax.text(x + 1.3, y + h / 2, txt, fontsize=fs, color=ND,
                va='center', ha='left', zorder=3)

    def harrow(x1, x2, y, label):
        ax.annotate('', xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle='-|>', color=NM, lw=0.9,
                                    mutation_scale=9), zorder=4)
        ax.text((x1 + x2) / 2, y + 1.3, label, ha='center', va='bottom',
                fontsize=5.2, style='italic', color=NM, zorder=4)

    def varrow(y1, y2, x, label):
        ax.annotate('', xy=(x, y2), xytext=(x, y1),
                    arrowprops=dict(arrowstyle='<|-|>', color=NM, lw=0.8,
                                    mutation_scale=8), zorder=4)
        ax.text(x + 1.6, (y1 + y2) / 2, label, ha='left', va='center',
                fontsize=4.8, style='italic', color=NM, zorder=4)

    # ---- centre stack (visual vocabulary: one hue per layer) --------------
    LH = 13
    layers = [
        (82, "Application layer", PALETTE['blue_main'], 1.0,
         ["React + Three.js + Chart.js", "client-side SPA, ~14k LOC TypeScript"]),
        (62, "Simulation layer", PALETTE['teal'], 1.0,
         ["spatial ABM (4 cell types) + 10-factor", "reaction-diffusion field + checkpoint phagocytosis"]),
        (42, "AI layer", PALETTE['violet'], 1.6,   # hero layer: stronger edge
         ["neural surrogate (MLP)", "context -> M1 / M2", r"$\approx$8$\times$ vs ODE (RK4)"]),
        (22, "Data layer", PALETTE['green_3'], 1.0,
         ["scRNA-seq + TAM atlas + literature priors", "calibratable parameters"]),
    ]
    cx0, cw = 30, 40
    for (y, title, hue, lw, lines) in layers:
        rbox(cx0, y, cw, LH, hue, hue, lw=0.7, alpha=0.10, z=1)
        ax.add_patch(mpatches.Rectangle((cx0, y), 1.5, LH, facecolor=hue,
                     edgecolor='none', zorder=2, alpha=0.9))
        ax.text(cx0 + 3.2, y + LH - 2.0, title, fontsize=7, fontweight='bold',
                color=hue, va='top', zorder=3)
        for i, ln in enumerate(lines):
            bold = (ln.startswith(r"$\approx$"))
            ax.text(cx0 + 3.2, y + LH - 5.0 - i * 2.5, ln, fontsize=5.4,
                    color=(hue if bold else ND), fontweight=('bold' if bold else 'normal'),
                    va='top', zorder=3)

    # hero glyph: the surrogate MLP, drawn inside the AI layer
    ai0 = 42
    cols_x = [53, 57.5, 62, 66.5]; counts = [4, 4, 4, 3]
    gy0, gy1 = ai0 + 2.8, ai0 + 10.2
    node_y = {c: np.linspace(gy0, gy1, n) for c, n in enumerate(counts)}
    for c in range(len(cols_x) - 1):
        for ya in node_y[c]:
            for yb in node_y[c + 1]:
                ax.plot([cols_x[c], cols_x[c + 1]], [ya, yb],
                        color=PALETTE['violet'], lw=0.25, alpha=0.18, zorder=2)
    for c, cxn in enumerate(cols_x):
        ax.plot([cxn] * len(node_y[c]), node_y[c], 'o', color=PALETTE['violet'],
                markersize=3.0, markeredgecolor='white', markeredgewidth=0.4, zorder=3)
    ax.text(60, ai0 + 1.3, '6-32-32-3', fontsize=4.6, color=PALETTE['violet'],
            ha='center', va='center', zorder=3)

    # vertical bidirectional flow between layers
    varrow(75.6, 81.4, 40, 'states / config')
    varrow(55.6, 61.4, 40, 'context / M1-M2')
    varrow(35.6, 41.4, 40, 'priors / params')

    # ---- left column: design inputs ---------------------------------------
    rbox(1, 22, 23, 73, NL, NM, lw=0.6, alpha=0.30, z=1)
    ax.text(2.5, 93, 'Design inputs', fontsize=6.5, fontweight='bold', color=ND, va='top', zorder=3)
    lx, lw_, ch = 2.5, 20, 4.4
    for i, t in enumerate(['CAR signaling domain', 'target antigen',
                           'binding affinity', 'checkpoint blockade']):
        chip(lx, 86 - i * 6, lw_, ch, t)
    ax.text(2.5, 61.5, 'TME scenario', fontsize=5.0, style='italic', color=ND, va='top', zorder=3)
    chip(lx, 56, lw_, ch, r'O$_2$ / lactate / TGF-$\beta$')
    chip(lx, 50, lw_, ch, 'random seed')

    # ---- right column: real-time readouts ---------------------------------
    rbox(76, 22, 23, 73, NL, NM, lw=0.6, alpha=0.30, z=1)
    ax.text(77.5, 93, 'Real-time readouts', fontsize=6.5, fontweight='bold', color=ND, va='top', zorder=3)
    rx = 77.5
    for i, t in enumerate(['tumor burden', 'phagocytosis rate', 'M1-M2 balance',
                           r'CD8$^+$ activation', 'spatial cytokine / ECM field', '3D cell viewer']):
        chip(rx, 86 - i * 6, lw_, ch, t)

    # horizontal control / observation arrows
    harrow(24, 30, 68, 'configure')
    harrow(70, 76, 68, 'observe')

    # ---- reproducibility ribbon -------------------------------------------
    rbox(30, 6, 40, 11, NL, NM, lw=0.6, alpha=0.45, z=1)
    ax.text(50, 13.6, 'Reproducibility & openness', fontsize=5.6, fontweight='bold',
            color=ND, ha='center', va='center', zorder=3)
    ax.text(50, 9.6, r'seed 20250706 $\rightarrow$ bit-for-bit runs; benchmark + code ship together',
            fontsize=4.9, color=ND, ha='center', va='center', zorder=3)

    save_pub(fig, os.path.join(BASE, 'figure1_architecture'))


# ============================================================
# FIGURE 2 — Surrogate performance (quantitative)
# ============================================================
def plot_fig2():
    # Measured benchmark medians (scripts/benchmark-surrogate.mjs, 11 timed
    # replicates); values live in data/benchmark_results.json so the figure,
    # source data, and paper always agree.
    with open(os.path.join(BASE, 'data', 'benchmark_results.json')) as f:
        BENCH = json.load(f)
    surr_us = BENCH['surrogate_us']
    ode_us = BENCH['ode_us']

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(7.0, 2.2),
                                     gridspec_kw={'width_ratios': [1, 1.3]})
    methods = ['Neural\nsurrogate', 'ODE\n(RK4)']
    vals = [surr_us, ode_us]
    cols = [PALETTE["teal"], PALETTE["red_strong"]]
    bars = ax1.bar(methods, vals, color=cols, edgecolor=PALETTE["neutral_black"],
                   linewidth=0.6, width=0.6)
    ax1.set_ylabel('Per-call latency ($\\mu$s)')
    ax1.set_ylim(0, max(vals) * 1.15)
    for b, v in zip(bars, vals):
        ax1.text(b.get_x() + b.get_width()/2, v + max(vals)*0.02, f'{v:.2f}',
                 ha='center', va='bottom', fontsize=6, fontweight='bold')
    ax1.text(0.5, 0.92, f'{ode_us/surr_us:.1f}$\\times$ speedup', transform=ax1.transAxes,
             fontsize=7, fontweight='bold', color=PALETTE["blue_main"],
             ha='center',
             bbox=dict(boxstyle='round,pad=0.2', fc='white',
                       ec=PALETTE["blue_main"], lw=0.8))
    add_panel_label(ax1, 'a')

    # (b) per-frame scaling (median µs per cell; N=55 -> measured ms/frame)
    N = np.array([20, 40, 55, 80, 100, 150])
    s_ms = surr_us * N / 1000
    o_ms = ode_us * N / 1000
    ax2.plot(N, s_ms, 'o-', color=PALETTE["teal"], lw=1.2, ms=3, label='Neural surrogate')
    ax2.plot(N, o_ms, 's-', color=PALETTE["red_strong"], lw=1.2, ms=3, label='ODE (RK4)')
    ax2.axhline(16.7, ls='--', color=PALETTE["neutral_mid"], lw=0.6,
                label='60 fps budget')
    ax2.axvline(55, ls=':', color=PALETTE["neutral_light"], lw=0.6)
    ax2.text(58, max(o_ms)*0.02, 'N = 55', fontsize=5, color=PALETTE["neutral_mid"])
    ax2.set_xlabel('Living agents (N)')
    ax2.set_ylabel('Polarization cost / frame (ms)')
    ax2.legend(loc='upper left', fontsize=5)
    add_panel_label(ax2, 'b')
    save_pub(fig, os.path.join(BASE, 'figure2_performance'))


# ============================================================
# FIGURE 3 — Mechanistic trends (2x2 quantitative grid)
# Honest: only panels with real dynamic signal from engine runs.
# M1/M2 discrete classification did not cross 0.6 threshold under
# deterministic seed; CD8+ activation remained at baseline.
# These are noted in the legend rather than plotted as flat lines.
# ============================================================
def plot_fig3():
    fig, axes = plt.subplots(2, 2, figsize=(7.0, 4.0))
    scens = ['baseline', 'HER2_low', 'no_CD47_block', 'high_TGFb', 'CD147_ECM']
    labels = {
        'baseline': 'Baseline',
        'HER2_low': 'HER2-low (aff=3)',
        'no_CD47_block': 'No CD47 block',
        'high_TGFb': 'High TGF-$\\beta$',
        'CD147_ECM': 'CD147 (ECM deg.)',
    }
    cols = DC[:5]

    panels = [
        ('tumorCount', 'Tumor cell count', axes[0, 0]),
        ('phagocytosisRate', 'Cumulative phagocytosis events', axes[0, 1]),
        ('ecmAverage', 'Mean ECM density', axes[1, 0]),
    ]
    for key, ylabel, ax in panels:
        for sn, c in zip(scens, cols):
            st, _ = get_series(sn)
            if not st: continue
            t = np.array(st['time']); y = np.array(st[key])
            ok = t > 0
            if ok.sum() < 2: continue
            ax.plot(t[ok], y[ok], color=c, lw=0.9, alpha=0.85,
                    label=labels.get(sn, sn))
        ax.set_ylabel(ylabel)
        ax.set_xlabel('Simulated time (min)')

    # Panel d: terminal cell composition stacked bar
    ax = axes[1, 1]
    type_order = ['CAR_MACROPHAGE', 'WILD_TYPE_MACROPHAGE', 'TUMOR_CELL', 'CD8_T_CELL']
    type_colors = {
        'CAR_MACROPHAGE': PALETTE["green_3"],
        'WILD_TYPE_MACROPHAGE': PALETTE["blue_secondary"],
        'TUMOR_CELL': PALETTE["red_strong"],
        'CD8_T_CELL': PALETTE["gold"],
    }
    type_labels = {
        'CAR_MACROPHAGE': 'CAR-M',
        'WILD_TYPE_MACROPHAGE': 'WT macrophage',
        'TUMOR_CELL': 'Tumor cell',
        'CD8_T_CELL': 'CD8+ T cell',
    }
    x_pos = np.arange(len(scens))
    bottom = np.zeros(len(scens))
    for ct in type_order:
        counts = []
        for sn in scens:
            _, cells = get_series(sn)
            n = sum(1 for c in cells if c['type'] == ct) if cells else 0
            counts.append(n)
        ax.bar(x_pos, counts, bottom=bottom, color=type_colors[ct],
               edgecolor='white', linewidth=0.3, width=0.7,
               label=type_labels[ct])
        bottom += np.array(counts)
    ax.set_xticks(x_pos)
    ax.set_xticklabels([labels[s] for s in scens], rotation=30, ha='right',
                       fontsize=5)
    ax.set_ylabel('Cell count (terminal)')

    # Legends
    axes[0, 0].legend(fontsize=4.5, loc='upper left', ncol=1)
    axes[1, 1].legend(fontsize=4.5, loc='upper right', ncol=2)

    for lbl, ax in zip('abcd', axes.flat):
        add_panel_label(ax, lbl)

    save_pub(fig, os.path.join(BASE, 'figure3_mechanistic_trends'))


# ============================================================
# FIGURE 4 — Spatial TME snapshot (scatter panels)
# ============================================================
def plot_fig4():
    fig, axes = plt.subplots(1, 3, figsize=(7.0, 2.3))
    type_colors = {
        'CAR_MACROPHAGE': PALETTE["green_3"],
        'WILD_TYPE_MACROPHAGE': PALETTE["blue_secondary"],
        'TUMOR_CELL': PALETTE["red_strong"],
        'CD8_T_CELL': PALETTE["gold"],
    }
    type_markers = {'CAR_MACROPHAGE': 'o', 'WILD_TYPE_MACROPHAGE': 's',
                    'TUMOR_CELL': '^', 'CD8_T_CELL': 'D'}
    type_labels = {'CAR_MACROPHAGE': 'CAR-M', 'WILD_TYPE_MACROPHAGE': 'WT macrophage',
                   'TUMOR_CELL': 'Tumor cell', 'CD8_T_CELL': 'CD8+ T cell'}
    snaps = ['baseline', 'high_TGFb', 'CD147_ECM']
    snap_lbl = ['Baseline', 'High TGF-$\\beta$', 'CD147 (ECM deg.)']

    for idx, (sn, lbl) in enumerate(zip(snaps, snap_lbl)):
        ax = axes[idx]
        _, cells = get_series(sn)
        if not cells: continue
        for ct in type_colors:
            sub = [c for c in cells if c['type'] == ct]
            if not sub: continue
            xs = [c['x'] for c in sub]; ys = [c['y'] for c in sub]
            ax.scatter(xs, ys, c=type_colors[ct], marker=type_markers[ct],
                       s=12, alpha=0.7, edgecolors='none',
                       label=type_labels[ct] if idx == 0 else '')
        ax.set_xlim(0, 800); ax.set_ylim(0, 600); ax.set_aspect('equal')
        ax.set_title(lbl, fontsize=6)
        ax.set_xlabel('x (spatial units)', fontsize=5.5)
        if idx == 0:
            ax.set_ylabel('y (spatial units)', fontsize=5.5)
        ax.set_facecolor('white')
        ax.tick_params(labelsize=5)

    if axes[0].get_legend_handles_labels()[1]:
        axes[0].legend(fontsize=4.5, loc='upper right', markerscale=1.2)
    for lbl, ax in zip('abc', axes):
        add_panel_label(ax, lbl)
    save_pub(fig, os.path.join(BASE, 'figure4_spatial_snapshot'))


# ============================================================
if __name__ == '__main__':
    import sys
    sel = sys.argv[1] if len(sys.argv) > 1 else 'all'
    print(f"Generating submission-grade figures (nature-figure protocol), sel={sel}...")
    if sel in ('all', '1'): plot_fig1()
    if sel in ('all', '2'): plot_fig2()
    if sel in ('all', '3'): plot_fig3()
    if sel in ('all', '4'): plot_fig4()
    print("Done. All figures in", BASE)
