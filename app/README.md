# CAR-M Virtual Cell

Interactive mechanism-informed simulator for CAR-engineered macrophages in a simplified tumor microenvironment.

The app is designed as a research prototype and presentation tool. It explores hypotheses around CAR-M phagocytosis, macrophage polarization, checkpoint blockade, ECM barriers, and CD8+ T-cell activation. It is not a calibrated clinical efficacy predictor.

## What It Models

- Agent-based cell dynamics for CAR-M, wild-type macrophages, tumor cells, and CD8+ T cells.
- Simplified cytokine and metabolic fields: oxygen, lactate, TGF-beta, IFN-gamma, IL-4, IL-10, VEGF, CXCL9, SPP1, and ECM density.
- CAR design parameters: signaling domain, target antigen, affinity, CD47/SIRP-alpha blockade, and CD24/Siglec-10 blockade.
- Seeded stochastic simulation so runs can be reproduced with the same random seed.
- A lightweight neural surrogate for macrophage polarization, trained against a synthetic ODE-style generator.

## Scientific Boundary

CT-0508 and related CAR-M literature are used as clinical context for parameter choices and scenario design. The simulation outputs should be interpreted as qualitative, hypothesis-generating trends unless independently calibrated against experimental or clinical datasets.

## Run Locally

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

## Reproducibility

Use the `Random Seed` control in the simulation panel to reproduce a run. Resetting with the same parameters and seed gives the same initialization and stochastic event sequence.

## Key Files

- `src/lib/simulation/engine.ts` - ABM engine, seeded RNG, statistics, proliferation, and export.
- `src/lib/simulation/cell.ts` - cell behavior rules, phagocytosis probability, antigen/checkpoint expression.
- `src/lib/simulation/field.ts` - cytokine, metabolite, and ECM field.
- `src/components/CarDesigner.tsx` - CAR-M design controls.
- `src/components/Dashboard.tsx` - live metrics and reference overlays.
