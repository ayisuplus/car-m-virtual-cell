# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

CAR-M Virtual Cell Simulator — an interactive, mechanism-informed simulator for
CAR-engineered macrophages in a simplified tumor microenvironment. It is a
research prototype / presentation tool, not a calibrated clinical predictor.

The frontend app lives in `app/` (Vite + React + TypeScript). Supporting
Python scripts for figures and source data live in `scripts/` and
`paper/figures/`.

## Key files (canonical routes)

See `app/README.md` "Key Files" for the authoritative routing:

- `app/src/lib/simulation/engine.ts` — ABM engine, seeded RNG, statistics, proliferation, export.
- `app/src/lib/simulation/cell.ts` — cell behavior rules, phagocytosis probability, antigen/checkpoint expression.
- `app/src/lib/simulation/field.ts` — cytokine, metabolite, and ECM field.
- `app/src/components/CarDesigner.tsx` — CAR-M design controls.
- `app/src/components/Dashboard.tsx` — live metrics and reference overlays.

## Boundaries

- `app/_archive/` is a READ-ONLY archive of dead code, old images, and
  superseded assets. Never modify, import from, or "fix" files under it;
  prefer deleting references in live code instead.
- `paper/figures/` outputs (PDF/PNG/SVG/TIFF) are generated artifacts —
  regenerate them via the Python scripts rather than editing them by hand.
- `app/public/models/*.glb` and `assets-poster/` are binary assets; do not
  rewrite them.

## Commands

All frontend commands run from `app/`:

```bash
npm install
npm run dev        # dev server (port 3000)
npm run lint       # eslint (ignores dist/ and _archive/)
npm run build      # tsc -b + vite build
npm test           # behavior checks: surrogate consistency + unit tests
```

Behavior checks (from repo root or via npm scripts):

```bash
node scripts/test-surrogate.mjs   # neural surrogate consistency gate (exit non-zero on failure)
```

Python figure/source-data regeneration: see `requirements.txt` and
`paper/figures/REGENERATE.md` (single-point guide: install, commands, and
how outputs map to the app simulation).

## Reproducibility

Simulation runs are seeded: same parameters + same random seed reproduce the
same initialization and stochastic event sequence (see `app/README.md`).
Do not replace the seeded RNG (`createSeededRandom`) with `Math.random` in
simulation paths.

## Change-validation expectations

- After touching `app/src/lib/simulation/`, run `npm test` in `app/`.
- `scripts/test-surrogate.mjs` guards the weight-matrix orientation invariant
  (historical P0 bug); keep it green and in sync with `neuralSurrogate.ts`.
- CI runs type check → lint → tests → build on every push.
