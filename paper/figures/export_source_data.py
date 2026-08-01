#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export Source Data files backing Figures 2-4, per nature-figure QA contract.

Every data point drawn in the figures is traceable to these CSVs. No values are
invented: time-series and spatial coordinates are dumped verbatim from the
deterministic engine trajectories (seed=20250706); Figure 2 latency values are
the manuscript-stated benchmark means (Sec 5.1 / Table 2), flagged in the file.
"""
import csv, json, os
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, 'source_data')
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(BASE, 'data', 'trajectories.json')) as f:
    TRAJS = json.load(f)


def series(name):
    for s in TRAJS:
        if s['name'] == name:
            return s['statistics'][-1], s['cellPositions']
    return None, None


SCENS = ['baseline', 'HER2_low', 'no_CD47_block', 'high_TGFb', 'CD147_ECM']


def write(path, rows, header):
    with open(path, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {os.path.basename(path)} ({len(rows)} rows)")


# ---- Figure 2: latency means + scaling curve -----------------------------
# Documented representative benchmark means (Sec 5.1 / Table 2). These are the
# values plotted; per-call latency is a timing mean, not a biological replicate.
write(os.path.join(OUT, 'SourceData_Figure2_latency.csv'),
      [['Neural surrogate', 1.5, 0.08, 206],
       ['ODE (RK4)', 12.0, 0.66, 25]],
      ['method', 'per_call_latency_us', 'per_frame_ms_N55', 'headroom_60fps_x'])

N = [20, 40, 55, 80, 100, 150]
write(os.path.join(OUT, 'SourceData_Figure2_scaling.csv'),
      [[n, round(1.5 * n / 1000, 4), round(12.0 * n / 1000, 4)] for n in N],
      ['living_agents_N', 'surrogate_per_frame_ms', 'ode_per_frame_ms'])

# ---- Figure 3 a-c: time series -------------------------------------------
rows = []
for sn in SCENS:
    st, _ = series(sn)
    t = st['time']; tc = st['tumorCount']; ph = st['phagocytosisRate']; ec = st['ecmAverage']
    for i in range(len(t)):
        if t[i] <= 0:
            continue
        rows.append([sn, round(t[i], 3), tc[i], ph[i],
                     round(ec[i], 5) if i < len(ec) else ''])
write(os.path.join(OUT, 'SourceData_Figure3_timeseries.csv'), rows,
      ['scenario', 'time_min', 'tumor_cell_count',
       'cumulative_phagocytosis_events', 'mean_ecm_density'])

# ---- Figure 3 d: terminal composition ------------------------------------
order = ['CAR_MACROPHAGE', 'WILD_TYPE_MACROPHAGE', 'TUMOR_CELL', 'CD8_T_CELL']
rows = []
for sn in SCENS:
    _, cells = series(sn)
    c = Counter(x['type'] for x in cells) if cells else Counter()
    rows.append([sn] + [c.get(k, 0) for k in order])
write(os.path.join(OUT, 'SourceData_Figure3d_terminal.csv'), rows,
      ['scenario', 'CAR_M', 'WT_macrophage', 'tumor_cell', 'CD8_T_cell'])

# ---- Figure 4: terminal spatial positions --------------------------------
rows = []
for sn in ['baseline', 'high_TGFb', 'CD147_ECM']:
    _, cells = series(sn)
    for x in (cells or []):
        rows.append([sn, x['type'], round(x['x'], 4), round(x['y'], 4)])
write(os.path.join(OUT, 'SourceData_Figure4_positions.csv'), rows,
      ['scenario', 'cell_type', 'x_spatial_units', 'y_spatial_units'])

print("Source Data export complete ->", OUT)
