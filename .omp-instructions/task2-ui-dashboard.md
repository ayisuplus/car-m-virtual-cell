# Task 2: UI/Dashboard Enhancement

You are working on the AI Virtual Macrophage (CAR-M) project at:
E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app

## Goal
Enhance the UI layer to display richer simulation data, add CT-0508 clinical reference lines on charts, improve CAR-M Designer to show signaling domain effects, and polish the overall presentation for a Cambridge visiting scholarship showcase.

## Files to Modify

1. `src/components/Dashboard.tsx` — Add reference lines, new charts
2. `src/components/CarDesigner.tsx` — Add signaling domain descriptions, ECM toggle
3. `src/components/ControlPanel.tsx` — Add ECM field toggle
4. `src/components/SimulationCanvas.tsx` — Add ECM overlay toggle button
5. `src/components/CellLegend.tsx` — Update legend with new info
6. `src/components/PresetScenarios.tsx` — Enhance scenario descriptions
7. `src/sections/ClinicalSection.tsx` — Improve CT-0508 data presentation

**Do NOT modify** any files under `src/lib/simulation/` or `src/types/` — those are handled by another agent.

---

## Task 2.1: Dashboard — CT-0508 Clinical Reference Lines

### In `src/components/Dashboard.tsx`:
The current Dashboard has 4 chart panels (tumor volume, phagocytosis rate, M1/M2 ratio, CD8 infiltration). Enhance each:

#### Tumor Volume Chart:
Add a horizontal dashed reference line showing CT-0508's best result (20% tumor reduction from baseline). If the initial tumor count is N, the reference line is at 0.8*N.
```typescript
// In the chart options plugins, add annotation:
plugins: {
  ...commonChartOptions.plugins,
  annotation: {
    annotations: {
      ct0508Line: {
        type: 'line',
        yMin: initialTumorCount * 0.8,
        yMax: initialTumorCount * 0.8,
        borderColor: 'rgba(255, 204, 0, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        label: {
          display: true,
          content: 'CT-0508 Best (−20%)',
          position: 'end',
          backgroundColor: 'rgba(255, 204, 0, 0.1)',
          color: '#ffcc00',
          font: { size: 9, family: 'monospace' },
        },
      },
    },
  },
}
```

NOTE: chartjs-plugin-annotation is needed. If not installed, add it:
```
npm install chartjs-plugin-annotation
```
And register it: `import annotationPlugin from 'chartjs-plugin-annotation'; ChartJS.register(annotationPlugin);`

#### CD8 Infiltration Chart:
Add reference showing CT-0508's observed CD8+ increase. Use a shaded region:
```
ct0508Range: {
  type: 'box',
  yMin: 0.3,
  yMax: 0.7,
  backgroundColor: 'rgba(255, 204, 0, 0.05)',
  borderColor: 'rgba(255, 204, 0, 0.2)',
  borderWidth: 1,
  label: {
    display: true,
    content: 'CT-0508 CD8+ Range',
    position: 'start',
  },
}
```

#### M1/M2 Ratio Chart:
Add reference line at M1 = 50% (the tipping point where immune response shifts from immunosuppressive to immunostimulatory):
```
m1TippingPoint: {
  type: 'line',
  yMin: 50,
  yMax: 50,
  borderColor: 'rgba(0, 255, 136, 0.3)',
  borderDash: [3, 3],
  borderWidth: 1,
  label: {
    display: true,
    content: 'M1 Tipping Point',
    position: 'start',
    color: '#00ff88',
    font: { size: 9 },
  },
}
```

---

## Task 2.2: CAR-M Designer — Signaling Domain Effects UI

### In `src/components/CarDesigner.tsx`:
The current designer has signaling domain selection but doesn't explain what each domain actually does. Enhance:

1. **Add a "Domain Effect" section** below the signaling domain grid that dynamically shows the selected domain's biological effect:
```typescript
const DOMAIN_EFFECTS: Record<SignalingDomain, { title: string; effect: string; color: string }> = {
  'CD3ζ': {
    title: 'Classic ITAM Signaling',
    effect: 'Triggers phagocytosis via Syk kinase → Rac1/Cdc42 → actin polymerization. Fast uptake (2-3s). Used in CT-0508.',
    color: '#00ff88',
  },
  'FcRγ': {
    title: 'Fc Receptor γ Chain',
    effect: 'Similar to CD3ζ but uses FcγR pathway. Slightly different downstream signaling. Comparable phagocytosis efficiency.',
    color: '#00ccff',
  },
  'CD147': {
    title: 'ECM Degradation Specialist',
    effect: 'Upregulates MMP secretion to degrade extracellular matrix. Does NOT trigger phagocytosis. Enables immune cell infiltration into dense tumors.',
    color: '#ffcc00',
  },
  'MerTK': {
    title: 'Efferocytosis Receptor',
    effect: 'Specializes in clearing apoptotic/dying cells (viability <40%). Slower uptake (4-6s) but works regardless of M1/M2 polarization.',
    color: '#cc66ff',
  },
};
```

Display this in a styled box below the domain selection grid:
```tsx
<div className="p-3 rounded-md border border-slate-700/50 bg-slate-800/20">
  <div className="flex items-center gap-2 mb-1">
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: effect.color }} />
    <span className="text-xs font-semibold" style={{ color: effect.color }}>{effect.title}</span>
  </div>
  <p className="text-[10px] text-slate-400 leading-relaxed">{effect.effect}</p>
</div>
```

2. **Add CD24/Siglec-10 checkpoint toggle** (currently only CD47/SIRPα exists):
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <span className="text-xs text-slate-300">CD24/Siglec-10 Blockade</span>
    <div className="text-[10px] text-slate-500">Secondary "don't eat me" signal</div>
  </div>
  <Switch
    checked={state.carDesign.checkpointBlockade.CD24_Siglec10}
    onCheckedChange={(v) =>
      updateCarDesign({ checkpointBlockade: { ...state.carDesign.checkpointBlockade, CD24_Siglec10: v } })
    }
  />
</div>
```

---

## Task 2.3: Control Panel — ECM Field Toggle

### In `src/components/ControlPanel.tsx`:
Add a toggle switch for showing the ECM density field overlay on the canvas. This needs a state that gets passed to the canvas rendering.

Add a new state in the SimContext or pass through props. Since we can't modify the context (it's in another file), use a local state in SimSection or a prop drilling approach.

Actually, the simplest approach: add a toggle in ControlPanel that stores in localStorage and reads in SimulationCanvas:
```tsx
// In ControlPanel, add after the "Show Field" toggle:
<div className="flex items-center justify-between">
  <span className="text-xs text-slate-400">ECM Overlay</span>
  <Switch
    checked={showECM}
    onCheckedChange={(v) => {
      setShowECM(v);
      localStorage.setItem('car-m-show-ecm', String(v));
    }}
  />
</div>
```

### In `src/components/SimulationCanvas.tsx`:
Read the localStorage value and pass to engine.render():
```typescript
const showECM = localStorage.getItem('car-m-show-ecm') === 'true';
// In the render call:
engine.current.render(ctx, showField, showECM);
```

Also update `src/lib/simulation/engine.ts` render method signature (note: this file is handled by the other agent, so just add a comment about the expected signature):
```
// NOTE: engine.render() needs to accept a third parameter for ECM overlay
// render(ctx, showField, showECM)
```

---

## Task 2.4: Preset Scenarios — Richer Descriptions

### In `src/components/PresetScenarios.tsx`:
Enhance the scenario descriptions with more scientific context. Update each scenario's `note` field:

```typescript
{
  id: 'ct-0508-baseline',
  name: 'CT-0508 Baseline',
  description: 'HER2 IHC 3+ breast cancer — matching Phase 1 clinical trial',
  note: 'Based on Carisma\'s CT-0508 (Nature Medicine 2025). 44% disease stability rate in HER2 3+ patients. CD47 blockade enabled.',
},
{
  id: 'her2-low',
  name: 'HER2 Low Expression',
  description: 'HER2 IHC 2+ — poor responder cohort',
  note: 'CT-0508 showed 0% response in HER2 2+ patients. Low affinity + no checkpoint blockade = minimal phagocytosis.',
},
{
  id: 'car-m-pd1-combo',
  name: 'CAR-M + Anti-PD-1 Combo',
  description: 'Combination therapy — enhanced T cell infiltration',
  note: 'CAR-M phagocytosis releases tumor antigens → T cell priming → PD-1 blockade sustains T cell activity. Simulates synergy.',
},
{
  id: 'cd147-ecm',
  name: 'CD147 ECM Degradation',
  description: 'Dense stroma — CD147 CAR-M tunnels through ECM',
  note: 'CD147 signal domain upregulates MMPs. CAR-M cells create channels through ECM, enabling T cell infiltration into tumor core.',
},
{
  id: 'cold-tumor',
  name: 'Cold Tumor',
  description: 'Highly immunosuppressive — minimal immune infiltration',
  note: 'High TGF-β (0.8) + low oxygen + dense ECM. Tests whether CAR-M can convert a "cold" tumor to "hot" by remodeling the TME.',
},
```

---

## Task 2.5: Clinical Section Enhancement

### In `src/sections/ClinicalSection.tsx`:
Read the current file first. If it already has CT-0508 data, enhance it with:
- A comparison table showing CAR-M vs CAR-T safety profile (CRS rates)
- Key timeline: discovery → preclinical → CT-0508 Phase 1 → CT-0525 IND
- A "What the simulation shows" paragraph connecting the clinical data to the simulation above

If the ClinicalSection is minimal, add structured content:
```tsx
<section id="clinical" className="py-16 px-4 md:px-8">
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold text-white mb-2">
      Clinical <span className="text-cyan-400">Context</span>
    </h2>
    <p className="text-slate-400 text-sm mb-8">
      CT-0508: First-in-human CAR-M therapy (Nature Medicine, April 2025)
    </p>
    
    {/* Key results grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <MetricCard label="Patients" value="14" sub="HER2+ solid tumors" />
      <MetricCard label="CRS ≥G3" value="0%" sub="Safety advantage over CAR-T" />
      <MetricCard label="Disease Stable" value="44%" sub="HER2 IHC 3+ only" />
      <MetricCard label="Tumor Reduction" value="−20%" sub="Best response (breast)" />
    </div>
    
    {/* CAR-M vs CAR-T comparison */}
    <div className="glass-panel p-6 rounded-xl mb-8">
      <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
        CAR-M vs CAR-T: Safety Profile
      </h3>
      {/* Table with comparison data */}
    </div>
    
    {/* Mechanism: phagocytosis → presentation → T cell activation */}
    <div className="glass-panel p-6 rounded-xl">
      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
        The Phagocytosis-Presentation-Activation Cascade
      </h3>
      <p className="text-sm text-slate-300 leading-relaxed">
        CAR-M cells phagocytose tumor cells → process and present tumor antigens via MHC → 
        activate CD8+ T cells → T cells proliferate and kill remaining tumors. 
        This cascade was validated by scRNA-seq in CT-0508 paired biopsies.
      </p>
    </div>
  </div>
</section>
```

---

## Task 2.6: CellLegend Enhancement

### In `src/components/CellLegend.tsx`:
Read the current file. Add the following info to the legend:
- Show each cell type with its color AND a brief description
- Add CAR-M signaling domain indicator (small colored dot that changes based on selected domain)
- Add a "Kill Events" counter (read from engine stats if available)

```tsx
// Legend items:
{ type: 'CAR-M', color: '#00ff88', desc: 'Engineered macrophage with CAR' },
{ type: 'M1 Macrophage', color: '#ff3366', desc: 'Anti-tumor polarization' },
{ type: 'M2 Macrophage', color: '#00ccff', desc: 'Pro-tumor polarization' },
{ type: 'Tumor', color: '#cc66ff', desc: 'Cancer cell (size = HER2 expr.)' },
{ type: 'CD8+ T Cell', color: '#ffcc00', desc: 'Cytotoxic T lymphocyte' },
```

---

## Important Notes
- The simulation engine files (src/lib/simulation/, src/types/) are being modified by another agent in parallel. They will add: ECM density field, CD8 exhaustion, CAR domain differentiation, tumor heterogeneity, T cell clone expansion.
- Your UI changes should anticipate these additions but NOT break if they're not present yet. Use optional chaining and fallback values for new stats fields (e.g., `statistics.ecmAverage?.[last] ?? 0`).
- Keep the existing glass-panel dark theme. All new UI should match the existing style.
- Use `text-[10px]` for very small text, `text-xs` for labels, `text-sm` for descriptions.
- Colors: cyan-400 for headings, slate-400 for body text, emerald-400 for success states.

## Commit
After all changes, run:
```
cd "E:\projects\AI虚拟细胞\Kimi_Agent_AI巨噬细胞MVP\app"
git add src/components/ src/sections/
git commit -m "feat: enhanced UI — CT-0508 reference lines, CAR domain effects, ECM toggle, clinical data"
```
