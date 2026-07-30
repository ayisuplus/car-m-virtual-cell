# CAR-M Simulator: A Mechanism-Inspired, Real-Time Agent-Based Platform for Exploring CAR-Engineered Macrophage Behavior in the Tumor Microenvironment

**Authors:** [Author Name(s)]¹
**Affiliation:** ¹[Institution] · Cambridge Visiting Research Program
**Correspondence:** [email]

---

## Abstract

Chimeric antigen receptor (CAR) T-cell therapy has transformed the treatment of hematological malignancies, yet its translation to solid tumors remains limited by poor infiltration, antigen heterogeneity, an immunosuppressive tumor microenvironment (TME), and toxicity. CAR-engineered macrophages (CAR-M) are an emerging alternative: macrophages natively infiltrate solid tissue and combine phagocytosis, antigen presentation, and microenvironmental remodeling. However, the design space of CAR-M constructs — signaling domain, target antigen, affinity, and checkpoint-blockade strategy — is large, and its interaction with TME conditions is difficult to reason about intuitively. We present **CAR-M Simulator**, a mechanism-inspired, browser-based platform that couples an agent-based model (ABM) of the TME, a reaction–diffusion field of ten soluble and structural factors, and a neural surrogate for macrophage polarization into an interactive, real-time simulation. The surrogate — a compact 6→32→32→3 multilayer perceptron trained on 30,000 synthetic samples from a biologically-motivated ordinary differential equation (ODE) model — replaces per-cell ODE integration and delivers an ~8× per-decision speedup in our benchmarks (1.5 µs vs. 12 µs per cell), keeping the whole scene interactive at 60 frames per second. We describe the platform architecture, the mechanistic models, and the engineering choices that make real-time, per-agent decision-making feasible in a web browser. We position the tool explicitly as a hypothesis-generation and educational instrument for *mechanistic trend exploration* — not clinical prediction — and outline a path toward data-driven parameter calibration. The platform is open, reproducible, and runs entirely client-side.

**Keywords:** CAR-macrophage, agent-based modeling, tumor microenvironment, neural surrogate, scientific visualization, in-browser simulation

---

## 1. Introduction

### 1.1 Motivation

Adoptive cell therapy with CAR-T cells achieves remarkable responses in B-cell malignancies, but solid tumors present a fundamentally harder problem. Effector cells struggle to penetrate the tumor stroma, are actively suppressed once inside, face heterogeneous and shifting antigen expression, and can provoke dangerous systemic toxicity [1,2]. CAR-engineered macrophages (CAR-M) have attracted growing attention precisely because macrophages address several of these barriers at once: they are naturally motile within solid tissue, they can be redirected to phagocytose antigen-positive tumor cells, and they participate in antigen presentation and TME remodeling [3,4]. The first-in-human trial of a HER2-directed CAR-M (CT-0508) reported an encouraging early safety profile, motivating broader interest in the modality [5].

Designing a CAR-M construct, however, means navigating a combinatorial space. The intracellular signaling domain (e.g., CD3ζ, FcRγ, CD147, MerTK) shapes the effector program; the target antigen (HER2, CD19, EGFR) and binding affinity set the recognition threshold; and checkpoint-blockade choices (CD47/SIRPα, CD24/Siglec-10 — the "don't-eat-me" axes) gate phagocytic execution [6,7]. These design levers do not act in isolation: their effect depends on TME conditions such as hypoxia, lactate accumulation, TGF-β load, and extracellular-matrix (ECM) density. Reasoning about the *joint* behavior of construct and context is exactly where intuition fails and where a computational sandbox can help.

### 1.2 Approach and contributions

We built CAR-M Simulator to make this joint behavior tangible. The platform lets a user configure a CAR-M construct and TME scenario, run a spatial agent-based simulation of the resulting cell population, and watch mechanistic readouts (tumor burden, phagocytosis rate, M1/M2 balance, CD8⁺ T-cell activation) evolve in real time. Our contributions are:

1. **An integrated, real-time TME model in the browser.** We combine a spatial ABM of four cell types with a ten-factor reaction–diffusion field and a checkpoint-aware phagocytosis model, running entirely client-side with no server dependency.

2. **A neural surrogate for the polarization bottleneck.** We replace the per-cell polarization ODE with a small MLP, and we quantify — with a reproducible benchmark — the speedup it provides and the interactivity headroom it buys.

3. **An honest, mechanism-inspired framing.** We are explicit that the platform explores *mechanistic trends* under stated assumptions and is intended for hypothesis generation, teaching, and experimental prioritization — not clinical prediction. We describe how parameters would be calibrated against data.

4. **A reproducible, open engineering artifact.** The simulation is deterministic under a fixed seed, the asset-generation pipeline is scripted, and the benchmark used for our performance claims ships with the code.

### 1.3 Scope and non-goals

We state the boundary up front because it governs every design decision that follows. CAR-M Simulator is a *mechanism-inspired* model. Its parameters are drawn partly from the literature and single-cell atlases and partly from plausibility-based assumptions; several relationships are deliberately simplified to remain real-time and interpretable. The tool is therefore appropriate for asking "which direction does this design push the system?" and inappropriate for asking "will this construct succeed in a patient?" Any quantitative readout should be read as a relative, directional comparison between configurations, not an absolute prediction.

---

## 2. Related Work

**Agent-based models of tumor–immune interaction.** ABMs have a long history in tumor immunology, from lattice models of tumor growth to off-lattice hybrid models coupling discrete cells with continuous chemical fields [8,9]. Frameworks such as PhysiCell provide powerful, high-fidelity multicellular simulation but target offline, high-performance computing rather than interactive, in-browser exploration [9]. Our design deliberately trades some fidelity for interactivity and accessibility.

**Data-driven single-cell modeling.** Single-cell RNA sequencing and tumor-associated-macrophage (TAM) atlases have made macrophage state landscapes far more legible, and deep generative models such as scVI provide principled low-dimensional representations of that landscape [10,11]. We borrow the *spirit* of these approaches — learned, compact representations of high-dimensional biology — in our surrogate, while acknowledging that our current model is trained on synthetic ODE-derived data rather than measured single-cell profiles.

**Surrogate modeling for simulation acceleration.** Replacing expensive numerical solvers with learned surrogates is now standard practice in scientific computing [12]. Our use is narrow but effective: the polarization step is the per-agent hot path, and a small MLP approximates its steady-state map at a fraction of the cost.

---

## 3. System Architecture

CAR-M Simulator is organized as four conceptual layers (Figure 1).

- **Data layer.** Biological priors — cytokine roles, polarization drivers, checkpoint biology — informed by literature and single-cell/TAM atlases. This layer supplies the *structure* of the models (which factors matter and in which direction), while their numerical parameters are treated as calibratable.

- **AI layer.** A neural surrogate that maps local cytokine and metabolic context to macrophage polarization state, replacing per-cell ODE integration (Section 4.4).

- **Simulation layer.** The agent-based engine, the reaction–diffusion field, the checkpoint-aware phagocytosis model, and the chemotaxis rules that together produce emergent population behavior (Sections 4.1–4.3).

- **Application layer.** A React + TypeScript single-page application with a Three.js 3D asset viewer and Chart.js dashboards, delivering the interactive workbench in which users design constructs, run scenarios, and compare outcomes.

The implementation is ~14,000 lines of TypeScript across ~93 files, built with Vite. The entire simulation runs on the client; there is no backend inference service.

---

## 4. Methods

### 4.1 Agent-based engine

The core is a continuous-space, discrete-time agent-based model. Four agent types populate a 2D domain representing a tissue cross-section: CAR-macrophages, wild-type macrophages, tumor cells, and CD8⁺ T-cells.

**Main loop.** Each frame advances the system by a bounded time step. The wall-clock delta is clamped to prevent instability, `dt = min(Δt_ms / 1000, 0.05) × speed`, where `speed` is a user-controlled multiplier; manual single-stepping uses a fixed `dt = 0.1 × speed`. The loop then, in order: (1) updates the diffusion field; (2) rebuilds the spatial index; (3) lets every living agent sense its local environment and act; (4) resolves CD8⁺ clonal expansion; (5) resolves tumor proliferation; (6) removes dead agents; and (7) samples statistics.

**Spatial indexing.** To avoid O(n²) neighbor queries, agents are hashed into a uniform grid with cell size 50 (spatial units). A neighbor query for radius *r* around a point visits only the grid buckets overlapping the axis-aligned box of half-width *r*, giving near-constant-time local lookups for the cell densities used here.

**Determinism.** All stochastic decisions draw from a seeded linear congruential generator, `x ← (1664525·x + 1013904223) mod 2³²`, returning `x / 2³²`. A fixed default seed (20250706) makes any run bit-for-bit reproducible, which is essential for honest A/B comparison of designs.

**Statistics.** The engine samples aggregate readouts every 0.5 simulated minutes and retains the most recent 200 points for plotting, bounding memory and keeping charts responsive during long runs.

### 4.2 Cell agents and behavior

Each agent carries a position, velocity, radius, and type-specific internal state. Baseline configuration is summarized in Table 1.

**Table 1. Agent configuration.**

| Agent type | Radius | Base speed | Initial count |
|---|---|---|---|
| CAR-macrophage | 10 | 0.8 | 12 |
| Wild-type macrophage | 9 | 0.5 | 8 |
| Tumor cell | 14 | 0.1 | 25 |
| CD8⁺ T-cell | 6 | 1.2 | 10 |

**Motility and chemotaxis.** Agents combine a persistent random walk (a Brownian force scaled to `0.3 × speed`, with velocity damping of 0.95) with directed chemotaxis. Macrophage chemotaxis reads local cytokine gradients by central differences and biases movement by polarization state: the effective gradient is `grad(IFN-γ)·m1Score + grad(TGF-β)·m2Score`, so M1-leaning cells move up pro-inflammatory gradients while M2-leaning cells follow immunosuppressive cues. CD8⁺ T-cells additionally follow the CXCL9 gradient with a step scaled by their activation level. Movement in all cases is slowed by local ECM density (a factor of `1 − 0.7 · ecmDensity`), modeling the stromal barrier.

**Checkpoint-aware phagocytosis.** The central mechanistic module is the CAR-M phagocytosis decision. For a candidate tumor target, the engine computes a base probability from receptor engagement and then modulates it by the two "don't-eat-me" checkpoint axes, the effector program, and metabolic state:

```
p_base    = (affinity / 10) × antigenDensity
cd47      = 1 − CD47_expr × (CD47 blocked ? 0.15 : 0.85)
cd24      = 1 − CD24_expr × (CD24 blocked ? 0.20 : 0.55)
m1Bonus   = CD3ζ: 1 + 0.5·m1Score | FcRγ: 1 + 0.3·m1Score | MerTK: 1
energy    = clamp(energy / 50, 0.3, 1)
p_final   = clamp(p_base × cd47 × cd24 × m1Bonus × energy, 0, 1)
```

Here `antigenDensity` is read from the target's HER2/CD19/EGFR expression according to the configured `targetAntigen`. The signaling domain changes behavior qualitatively, not just quantitatively: **CD3ζ** and **FcRγ** give standard phagocytosis with an M1-dependent bonus; **CD147** does not phagocytose at all but instead secretes matrix metalloproteinase, degrading local ECM (`−0.01 · dt` per step) to model stromal remodeling; and **MerTK** performs efferocytosis, engaging only low-viability targets (viability < 0.4) but with doubled probability. Successful phagocytosis costs 30 energy units and occupies the cell for a domain-dependent duration (≈2–4 s). Wild-type macrophages retain only weak, M1-gated phagocytic activity, providing an internal control arm.

**Polarization dynamics.** Rather than integrating a polarization ODE per cell per frame, each macrophage queries the neural surrogate (Section 4.4) with its local cytokine and metabolic context to obtain target M1/M2 scores, then relaxes toward them exponentially: `m1Score += (nnM1 − m1Score) · τ · dt · 10` with `τ = 0.15` (and symmetrically for M2). Discrete phenotype is assigned by thresholding (M1 if m1Score > 0.6, M2 if m2Score > 0.6, otherwise MIXED). CAR-M cells start balanced (m1 = m2 = 0.5); wild-type macrophages start M2-skewed (m1 = 0.2, m2 = 0.8), reflecting the default TAM state.

**CD8⁺ T-cell effector logic.** Activated, non-anergic CD8⁺ cells kill on contact with probability `0.08 · activationLevel · (1 − 0.8·exhaustion)`; three or more kills trigger delayed clonal expansion (capped). Exhaustion accumulates under immunosuppression and is relieved by IFN-γ: `d(exhaustion) = (0.05·TGF-β + 0.03·IL-10 − 0.02·IFN-γ) · dt`, coupling adaptive immunity to the macrophage-shaped cytokine milieu.

### 4.3 Reaction–diffusion field

Ten factors are simulated on a uniform grid with spacing 40 units: **oxygen, lactate, TGF-β, IFN-γ, IL-4, IL-10, VEGF, CXCL9, SPP1, and ECM density**. These span metabolic state (O₂, lactate), immunosuppression (TGF-β, IL-10, SPP1), pro-inflammatory signaling (IFN-γ, CXCL9), M2 induction (IL-4), angiogenesis (VEGF), and the structural stromal barrier (ECM).

Each factor evolves by explicit finite-difference diffusion with a five-point Laplacian and zero-flux (Neumann) boundaries. Per step, a factor first decays and then diffuses:

```
c_new(i,j) = c(i,j) + (D·dt / h²) · [ c(i+1,j) + c(i−1,j) + c(i,j+1) + c(i,j−1) − 4·c(i,j) ]
```

with diffusion coefficient `D = 1000` for soluble factors and `D = 50` for the near-static ECM. First-order decay rates differ by factor (e.g., IFN-γ ≈ 0.04, IL-4/IL-10/CXCL9/SPP1 ≈ 0.03, lactate/VEGF ≈ 0.02 per step), while oxygen relaxes toward a baseline of 0.5. Sources and sinks are cell-driven: tumor cells consume oxygen and secrete lactate, TGF-β, and VEGF (amplified under hypoxia); M1 macrophages and activated CD8⁺ cells secrete IFN-γ and CXCL9; M2 macrophages secrete IL-10 and SPP1; and CD147 CAR-M degrade ECM. Initial fields are laid out radially to create a hypoxic, immunosuppressive tumor core surrounded by a better-oxygenated rim.

### 4.4 Neural surrogate for polarization

**Architecture.** The surrogate is a fully-connected MLP with layer sizes **6 → 32 → 32 → 3**, ReLU activations on the two hidden layers and a sigmoid on the output. It maps a six-dimensional local context — `[IFN-γ, IL-4, IL-10, TGF-β, oxygen, lactate]`, each normalized to [0,1] — to `[M1_score, M2_score, phagocytosis_probability]`; the simulation consumes the two polarization outputs to drive the relaxation dynamics of Section 4.2.

**Training.** The network was trained on 30,000 synthetic samples generated by a biologically-motivated ODE polarization model over the input space, for 100 epochs, reaching 95.96% validation accuracy against the ODE-derived labels. In effect, the surrogate learns a fast, differentiable approximation of the ODE's steady-state map. We emphasize that the *ground truth* here is the ODE itself, not experimental data; calibrating both against measured single-cell profiles is future work (Section 6).

**Inference engine.** Weights are stored inline and pre-flattened into `Float32Array` buffers at load time to avoid per-call allocation. Inference is a straightforward layer-by-layer matrix–vector product with fused activation, running as scalar CPU loops (no SIMD or GPU). Because the network is tiny, this naive path is more than fast enough (Section 5).

---

## 5. Results

### 5.1 Surrogate performance

We benchmarked the exact production inference path against an equivalent RK4 ODE polarization solver over the same six-dimensional input space (200,000 randomized evaluations each, after JIT warm-up; a reproducible script ships with the code). The surrogate averaged **1.5 µs per cell-decision** versus **12 µs** for the ODE integrator — an **~8× speedup** for the polarization step. Table 2 translates this into per-frame budget for a representative scene of 55 living agents.

**Table 2. Polarization cost per frame (N = 55 agents).**

| Method | Per-call | Per-frame (N=55) | 60 fps headroom |
|---|---|---|---|
| Neural surrogate | 1.5 µs | 0.08 ms | ~206× |
| ODE (RK4) | 12 µs | 0.66 ms | ~25× |

Two honest caveats. First, our RK4 baseline relaxes to a quasi-steady state over 200 integration steps; a stiffer or higher-accuracy solver, or a larger cell population, would widen the gap substantially, whereas a coarser ODE would narrow it. The speedup is therefore a property of the solver configuration, not a universal constant. Second, earlier internal presentation material quoted an "847 ms vs. 0.3 ms" figure; that number is **not** reproducible from the source and we do not use it. The measured ~8× is the claim we stand behind. The practical takeaway is unchanged: with the surrogate, polarization consumes well under 1 ms per frame even at scene scale, leaving ample budget for rendering and interaction and keeping the workbench fluid.

### 5.2 Qualitative mechanistic behavior

Under a fixed seed, the platform produces reproducible, mechanistically plausible trajectories that respond in the expected *direction* to design and context changes. Representative observations from scripted scenarios include:

- **Checkpoint blockade gates phagocytosis.** Enabling CD47/SIRPα blockade raises the `cd47` multiplier in the phagocytosis probability, visibly increasing tumor-clearance rate relative to the unblocked baseline, consistent with the "don't-eat-me" biology the module encodes.

- **Signaling-domain choice changes the mechanism, not just the rate.** Switching to CD147 shifts the CAR-M from direct killing to ECM degradation: tumor counts fall more slowly, but ECM density drops and downstream motility improves — a qualitatively different route to the same goal.

- **TME context modulates outcome.** Raising TGF-β or lowering antigen density (a HER2-low scenario) flattens the tumor-clearance and CD8-activation curves, reproducing the intuition that an immunosuppressive or antigen-poor context blunts efficacy.

- **Adaptive coupling emerges.** M1-skewed CAR-M raise local IFN-γ and CXCL9, which recruit and sustain CD8⁺ T-cells; heavy TGF-β/IL-10 loads instead accumulate CD8 exhaustion. This macrophage→T-cell coupling is emergent from the field, not hard-coded.

We stress that these are *directional* results appropriate for hypothesis generation and teaching. We report them as trends, not as calibrated quantitative predictions.

### 5.3 Interactivity and reproducibility

The full application builds to a static bundle and runs client-side; a production build completes in ~11 s and the simulation sustains interactive frame rates on commodity laptops. Determinism under a fixed seed means any comparison shown in the interface — baseline vs. modified construct — can be reproduced exactly, which we consider a prerequisite for using the tool to reason about design differences rather than sampling noise.

---

## 6. Discussion

### 6.1 What the platform is good for

CAR-M Simulator turns an abstract design space into something a researcher, student, or reviewer can manipulate and watch. Its value is threefold. As a **hypothesis-generation** tool, it lets a user quickly ask "which lever matters most here?" and see the direction and rough sensitivity of the response — useful for prioritizing which constructs or contexts merit costly wet-lab investigation. As a **teaching** instrument, it makes normally invisible couplings — checkpoint biology, polarization, cytokine cross-talk, adaptive recruitment — concrete and interactive in a way static figures cannot. As an **engineering demonstration**, it shows that a non-trivial, multi-scale mechanistic model can run in real time in a browser, lowering the barrier to sharing and reproducing computational immunology models.

### 6.2 The surrogate trade-off

The neural surrogate is the design choice that makes per-agent, per-frame decision-making tractable. Its cost is a layer of approximation: the network reproduces the ODE's steady-state map to ~96% accuracy, and the simulation further approximates dynamics by exponential relaxation toward that map rather than full integration. We view this as an acceptable and, importantly, *inspectable* trade-off — the surrogate can be toggled and compared against the ODE, and its error is bounded by the training distribution. The broader lesson is that even a tiny learned surrogate can remove a real interactivity bottleneck without a GPU.

### 6.3 Honest positioning versus clinical prediction

We have been deliberate about framing throughout, and we reiterate it because it is easy to over-claim with a polished interface. The model's structure encodes real biology, but its numbers are a mixture of literature-derived and assumed values, and its dynamics are simplified for real-time use. It is a tool for exploring *mechanistic trends*, not for predicting patient outcomes. Where we reference clinical context — for example, using the CT-0508 HER2 CAR-M trial to inspire a baseline scenario [5] — that reference is a *design anchor and narrative aid*, not a validation of the model. No result from this platform should be read as a claim that the simulation predicts the trial.

---

## 7. Limitations and Future Work

**Limitations.** (1) The domain is 2D and represents a tissue cross-section, not full 3D architecture or vasculature dynamics. (2) Cell counts are modest (tens to low hundreds) to preserve interactivity, so rare-event statistics are noisy. (3) The surrogate's ground truth is a synthetic ODE, not measured single-cell data, so it inherits that ODE's structural assumptions. (4) Several parameters (secretion rates, probabilities, thresholds) are plausibility-based rather than fitted. (5) Performance figures are single-machine JavaScript benchmarks and will vary across hardware.

**Future work.** The clearest next step is **data-driven calibration**: fitting field and cell parameters, and retraining the surrogate, against public scRNA-seq and TAM-atlas datasets so that simulated trends can be checked for consistency with measured macrophage-state distributions [10,11]. Beyond calibration, we plan to (i) add uncertainty reporting so directional comparisons carry confidence bands; (ii) extend the phagocytosis and polarization modules with additional checkpoint axes and metabolic states; (iii) explore GPU-accelerated fields to raise the agent ceiling; and (iv) close a "design → context → validation" loop in which simulator-prioritized hypotheses feed experiments whose results recalibrate the model.

---

## 8. Conclusion

We presented CAR-M Simulator, a mechanism-inspired, real-time, in-browser platform that couples an agent-based TME model, a ten-factor reaction–diffusion field, and a neural surrogate for macrophage polarization into an interactive workbench for exploring CAR-engineered macrophage behavior. By replacing per-cell ODE integration with a compact learned surrogate, the platform keeps a multi-scale mechanistic simulation fluid on ordinary hardware, and its deterministic engine makes design comparisons reproducible. We have been explicit that the tool explores mechanistic trends for hypothesis generation and teaching rather than clinical prediction, and we have outlined a concrete path toward data-driven calibration. Our aim is a computational sandbox where mechanistic hypotheses can "run on screen" first — and, ultimately, connect back to the experiments that keep them honest.

---

## Data and Code Availability

The platform is an open web application. The simulation is deterministic under a fixed seed, and the benchmark used for the performance claims in Section 5 is included in the repository (`scripts/benchmark-surrogate.mjs`). Asset-generation pipelines are scripted for reproducibility.

## Acknowledgments

We thank the Cambridge visiting research program and colleagues who provided feedback on the mechanistic scope and surrogate trade-offs.

---

## References

[1] June CH, Sadelain M. Chimeric Antigen Receptor Therapy. *N Engl J Med.* 2018;379(1):64–73.

[2] Rafiq S, Hackett CS, Brentjens RJ. Engineering strategies to overcome the current roadblocks in CAR T cell therapy. *Nat Rev Clin Oncol.* 2020;17(3):147–167.

[3] Klichinsky M, Ruella M, Shestova O, et al. Human chimeric antigen receptor macrophages for cancer immunotherapy. *Nat Biotechnol.* 2020;38(8):947–953.

[4] Sloas C, Gill S, Klichinsky M. Engineered CAR-Macrophages as Adoptive Immunotherapies for Solid Tumors. *Front Immunol.* 2021;12:783305.

[5] Reiss KA, Angelos MG, Dees EC, et al. CAR-macrophage therapy for HER2-overexpressing advanced solid tumors: a phase 1 trial (CT-0508). *Nat Med.* 2025 (first-in-human report).

[6] Chao MP, Weissman IL, Majeti R. The CD47–SIRPα pathway in cancer immune evasion and potential therapeutic implications. *Curr Opin Immunol.* 2012;24(2):225–232.

[7] Barkal AA, Brewer RE, Markovic M, et al. CD24 signalling through macrophage Siglec-10 is a target for cancer immunotherapy. *Nature.* 2019;572(7769):392–396.

[8] Macklin P, Edgerton ME, Thompson AM, Cristini V. Patient-calibrated agent-based modelling of ductal carcinoma in situ. *J Theor Biol.* 2012;301:122–140.

[9] Ghaffarizadeh A, Heiland R, Friedman SH, Mumenthaler SM, Macklin P. PhysiCell: An open source physics-based cell simulator for 3-D multicellular systems. *PLoS Comput Biol.* 2018;14(2):e1005991.

[10] Lopez R, Regier J, Cole MB, Jordan MI, Yosef N. Deep generative modeling for single-cell transcriptomics (scVI). *Nat Methods.* 2018;15(12):1053–1058.

[11] Cheng S, Li Z, Gao R, et al. A pan-cancer single-cell transcriptional atlas of tumor infiltrating myeloid cells. *Cell.* 2021;184(3):792–809.

[12] Kasim M, Watson-Parris D, Deaconu L, et al. Building high accuracy emulators for scientific simulations with deep neural architecture search. *Mach Learn: Sci Technol.* 2022;3(1):015013.

---

*Manuscript prepared for the Cambridge visiting research program. The CT-0508 reference is used solely as a design anchor and narrative context; it is not a validation of the simulation. All performance numbers are measured from the shipped benchmark on a single machine and will vary by hardware.*
