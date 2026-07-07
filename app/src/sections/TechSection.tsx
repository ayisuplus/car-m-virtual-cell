import { Cpu, Layers, GitBranch, Brain } from 'lucide-react';
import NeuralSurrogateDemo from '@/components/NeuralSurrogateDemo';

const TECH_LAYERS = [
  {
    name: 'Data Layer',
    color: '#cc66ff',
    items: ['scRNA-seq (Scanpy)', 'TAM Atlas', 'KEGG/Reactome', 'AlphaFold3'],
    desc: 'Multi-omics data integration and pathway topology',
  },
  {
    name: 'AI/ML Layer',
    color: '#00ff88',
    items: ['scVI-tools (VAE)', 'CellForge (Multi-Agent)', 'Neural Surrogate', 'AIVC Perturbation Model', 'PyTorch'],
    desc: 'Deep generative models and fast ODE approximation',
  },
  {
    name: 'Simulation Layer',
    color: '#00ccff',
    items: ['ABM Engine', 'BioFVM Diffusion', 'Polarization ODEs', 'Phagocytosis Model'],
    desc: 'Agent-based modeling with multi-scale coupling',
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
    desc: 'PyTorch-trained feedforward networks replace expensive ODE solving, achieving >98% accuracy with 100x speedup — enabling real-time simulation of 100+ cell decisions per frame.',
    icon: <GitBranch className="w-5 h-5" />,
    color: '#00ff88',
  },
  {
    title: 'AI-Guided Design',
    desc: "Inspired by CellForge's multi-agent framework, our platform enables computational hypothesis testing \u2014 adjust CAR parameters, block checkpoints, and observe predicted outcomes before wet-lab experiments.",
    icon: <Brain className="w-5 h-5" />,
    color: '#ff3366',
  },
  {
    title: 'Multi-scale Coupling',
    desc: 'Molecular signaling (ODE) → Cell behavior (state machine) → Tissue dynamics (ABM) → Cytokine diffusion (PDE). Each scale informs the others in a continuous feedback loop.',
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

        {/* Architecture diagram */}
        <div className="mb-16">
          <div className="glass-panel rounded-xl p-6 md:p-8">
            <div className="grid md:grid-cols-4 gap-4">
              {TECH_LAYERS.map((layer, idx) => (
                <div key={layer.name} className="relative">
                  <div
                    className="rounded-lg p-4 border h-full"
                    style={{
                      borderColor: `${layer.color}30`,
                      backgroundColor: `${layer.color}08`,
                    }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-3"
                      style={{ color: layer.color }}
                    >
                      {layer.name}
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {layer.items.map((item) => (
                        <div key={item} className="text-xs text-slate-300 flex items-center gap-1.5">
                          <span
                            className="w-1 h-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                          {item}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{layer.desc}</p>
                  </div>
                  {/* Arrow between layers */}
                  {idx < TECH_LAYERS.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <div className="text-slate-600 text-lg">→</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass-panel p-6 rounded-xl hover:border-opacity-50 transition-all duration-300"
              style={{ borderColor: `${feature.color}20` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
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
