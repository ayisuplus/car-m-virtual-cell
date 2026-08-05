import { Cpu, Layers, GitBranch, Brain } from 'lucide-react';
import NeuralSurrogateDemo from '@/components/NeuralSurrogateDemo';

const TECH_LAYERS = [
  {
    name: 'Data Layer',
    color: '#cc66ff',
    items: ['scRNA-seq (GSE289149, Scanpy)', 'Literature priors', 'TAM atlas (calibration, planned)'],
    desc: 'Biological priors that inform model structure; calibratable parameters',
  },
  {
    name: 'AI/ML Layer',
    color: '#00ff88',
    items: ['Neural Surrogate (MLP 6-32-32-3)', 'Reproducible training script', 'scVI / CellForge (inspiration only)'],
    desc: 'Fast ODE surrogate with reproducible training and benchmark',
  },
  {
    name: 'Simulation Layer',
    color: '#00ccff',
    items: ['ABM Engine (TypeScript)', 'Reaction-diffusion field', 'Checkpoint-aware phagocytosis', 'Polarization relaxation'],
    desc: 'Agent-based modeling with seeded reproducibility',
  },
  {
    name: 'Application Layer',
    color: '#ffcc00',
    items: ['React + TypeScript', 'Canvas 2D Renderer', 'Chart.js', 'Real-time UI'],
    desc: 'Interactive simulation workbench and visual analytics',
  },
];

const FEATURES = [
  {
    title: 'Agent-Based Modeling',
    desc: 'Each cell is an autonomous agent with individual state, making local decisions based on microenvironmental cues. Emergent tissue-level behaviors arise from cell-cell interactions.',
    icon: <Cpu className="w-5 h-5" />,
    color: '#00ccff',
  },
  {
    title: 'Neural Surrogate',
    desc: 'A small MLP (6→32→32→3) approximates the polarization ODE steady-state map, removing the per-cell ODE solve from the ABM hot path. Trained reproducibly (scripts/train-surrogate.mjs); speedup measured by scripts/benchmark-surrogate.mjs.',
    icon: <GitBranch className="w-5 h-5" />,
    color: '#00ff88',
  },
  {
    title: 'AI-Guided Design',
    desc: 'Inspired by CellForge-style multi-agent frameworks, our platform enables computational hypothesis testing — adjust CAR parameters, block checkpoints, and observe predicted outcomes before wet-lab experiments.',
    icon: <Brain className="w-5 h-5" />,
    color: '#ff3366',
  },
  {
    title: 'Multi-scale Coupling',
    desc: 'Molecular signaling (ODE) → Cell behavior (state machine) → Tissue dynamics (ABM) → Cytokine diffusion (reaction-diffusion field). Each scale informs the others in a continuous feedback loop.',
    icon: <Layers className="w-5 h-5" />,
    color: '#ffcc00',
  },
];

export default function TechSection() {
  return (
    <section id="technology" className="py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/5 mb-4">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium uppercase">Architecture</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Four-Layer <span className="text-cyan-400">Tech Stack</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Inspired by CZI's Virtual Cell initiative, our architecture separates data ingestion,
            AI modeling, simulation execution, and user interaction into composable layers.
          </p>
        </div>

        {/* Architecture diagram — enhanced */}
        <div className="mb-16">
          <div className="glass-panel rounded-xl p-6 md:p-8 gradient-border">
            <div className="grid md:grid-cols-4 gap-5">
              {TECH_LAYERS.map((layer, idx) => (
                <div key={layer.name} className="relative group">
                  <div
                    className="rounded-xl p-5 border h-full transition-all duration-500 hover-lift"
                    style={{
                      borderColor: `${layer.color}25`,
                      backgroundColor: `${layer.color}06`,
                    }}
                  >
                    {/* Layer number indicator */}
                    <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                      style={{ 
                        borderColor: layer.color, 
                        backgroundColor: '#0a0f1a',
                        color: layer.color 
                      }}>
                      {idx + 1}
                    </div>
                    
                    <div
                      className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                      style={{ color: layer.color }}
                    >
                      <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: layer.color }} />
                      {layer.name}
                    </div>
                    <div className="space-y-2 mb-4">
                      {layer.items.map((item) => (
                        <div key={item} className="text-xs text-slate-300 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 group-hover:scale-150 transition-transform duration-300"
                            style={{ backgroundColor: layer.color }}
                          />
                          {item}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors duration-300">{layer.desc}</p>
                    
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ boxShadow: `inset 0 0 30px ${layer.color}10` }} />
                  </div>
                  
                  {/* Arrow between layers — animated */}
                  {idx < TECH_LAYERS.length - 1 && (
                    <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:border-cyan-400/50 transition-colors duration-300">
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Connection line */}
            <div className="hidden md:block relative h-1 mt-6 mx-8">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-yellow-500/30 rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-500 to-yellow-500 rounded-full animate-shimmer opacity-50" />
            </div>
          </div>
        </div>

        {/* Feature cards — enhanced */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass-panel p-6 rounded-xl gradient-border hover-lift group relative overflow-hidden"
              style={{ borderColor: `${feature.color}15` }}
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ 
                  background: `radial-gradient(circle, ${feature.color}15 0%, transparent 70%)`,
                  transform: 'translate(30%, -30%)'
                }} 
              />
              
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 relative z-10 group-hover:scale-110 transition-transform duration-500"
                style={{ 
                  backgroundColor: `${feature.color}12`,
                  color: feature.color,
                  boxShadow: `0 0 20px ${feature.color}10`
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-3 relative z-10 group-hover:text-white transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed relative z-10 group-hover:text-slate-300 transition-colors duration-300">
                {feature.desc}
              </p>
              
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${feature.color}, transparent)` }} />
            </div>
          ))}
        </div>

        {/* Neural Surrogate Demo */}
        <NeuralSurrogateDemo />

        {/* Code snippet preview */}
        <div className="mt-12 glass-panel rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-2">simulation/engine.ts</span>
          </div>
          <pre className="p-4 text-xs text-slate-300 overflow-x-auto">
            <code>{`// Agent-Based Modeling Engine Core
class ABMEngine {
  cells: Cell[];
  field: CytokineField;
  
  update(dt: number) {
    // 1. Update cytokine diffusion fields
    this.field.update(this.cells, dt);
    
    // 2. Per-cell decision loop
    for (const cell of this.cells) {
      const env = this.field.getAt(cell.position);
      
      // Neural surrogate replaces ODE solve
      const polarization = this.neuralSurrogate.predict(env);
      
      // CAR-mediated phagocytosis check
      if (cell.type === 'CAR_M' && cell.canPhagocytose(env)) {
        cell.startPhagocytosis(target);
      }
      
      cell.update(dt, env, this.cells);
    }
  }
}`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
