import { Cpu, Layers, GitBranch, Brain, Database, Network, Focus } from 'lucide-react';
import NeuralSurrogateDemo from '@/components/NeuralSurrogateDemo';

const TECH_LAYERS = [
  {
    name: 'Data Layer',
    color: '#cc66ff',
    items: [
      'TCGA 多组学 (mRNA / 突变 / CNV / 甲基化)',
      'STRING PPI 网络 (基因骨架 ~10K 节点)',
      'scRNA-seq 参考 (GSE289149) · TAM atlas',
    ],
    desc: 'TCGA 真实癌症多组学 + 生物先验图驱动模型结构；可校准参数',
  },
  {
    name: 'AI/ML Layer',
    color: '#00ff88',
    items: [
      'GAT Neural Surrogate (2-layer Graph Attention Network)',
      'TCGA 数据驱动训练 (python/gnn_train.py)',
      'STRING PPI 生物先验图 (~200K 边)',
    ],
    desc: '图注意力代理在 TCGA 多组学 + 生物先验图上可复现训练',
  },
  {
    name: 'Simulation Layer',
    color: '#00ccff',
    items: [
      'ABM Engine (TypeScript)',
      'SpatialHash 空间邻近 → 细胞交互图',
      'Reaction-diffusion field',
      'Checkpoint-aware phagocytosis · Polarization relaxation',
    ],
    desc: 'Agent-based modeling 与 GAT 图推理无缝集成，播种可复现',
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
    title: 'GAT Neural Surrogate',
    desc: 'A 2-layer Graph Attention Network (co-invented by Prof. Pietro Liò, ICLR 2018) learns the gene→phenotype mapping over a STRING PPI biological-prior graph, trained on TCGA multi-omics. Attention weights reveal key pathways; deterministic pure-JS inference replaces the per-cell ODE solve in the ABM hot path.',
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
    desc: 'Molecular signaling (GAT/ODE) → Cell behavior (state machine) → Tissue dynamics (ABM) → Cytokine diffusion (reaction-diffusion field). Each scale informs the others in a continuous feedback loop.',
    icon: <Layers className="w-5 h-5" />,
    color: '#ffcc00',
  },
];

/** TCGA → GAT → CAR-M 核心故事线。 */
const PIPELINE = [
  {
    step: '01',
    title: 'TCGA 真实数据',
    desc: '从 TCGA (The Cancer Genome Atlas) 获取癌症多组学数据 (mRNA / 突变 / CNV / 甲基化)，构建真实患者队列。',
    color: '#cc66ff',
    icon: <Database className="w-5 h-5" />,
  },
  {
    step: '02',
    title: '生物先验图',
    desc: 'STRING PPI 网络作为图骨架——约 10K 基因节点、约 200K 边，引入真实的基因-基因相互作用先验。',
    color: '#00ff88',
    icon: <Network className="w-5 h-5" />,
  },
  {
    step: '03',
    title: 'GAT 训练',
    desc: '2 层图注意力网络学习基因→表型的映射，注意力机制自动加权关键邻居基因。',
    color: '#00ccff',
    icon: <GitBranch className="w-5 h-5" />,
  },
  {
    step: '04',
    title: '可解释预测',
    desc: '注意力权重揭示关键通路与基因，为免疫分型与生存风险提供可解释的机制线索。',
    color: '#ffcc00',
    icon: <Focus className="w-5 h-5" />,
  },
  {
    step: '05',
    title: '模拟器集成',
    desc: '训练好的 GAT 代理模型在浏览器中以纯 JS 确定性推理，实时驱动 CAR-M 模拟。',
    color: '#ff3366',
    icon: <Cpu className="w-5 h-5" />,
  },
];

/** 技术参数展示。 */
const GAT_PARAMS = [
  { label: 'GAT 层数', value: '2' },
  { label: '注意力头', value: 'Layer0 = 4 · Layer1 = 1' },
  { label: '节点特征维度', value: '24' },
  { label: '推理模式', value: '纯 JS / Float32Array · 确定性' },
  { label: '图构建', value: 'SpatialHash 空间邻近查询' },
];

/** 与 Pietro Liò 教授研究的契合点。 */
const LIO_AFFINITIES = [
  {
    title: 'GAT — 共同发明',
    desc: 'Graph Attention Network 由 Liò 教授与 Veličković 等人共同引入 (ICLR 2018)，是图注意力机制的奠基工作。',
    color: '#00ff88',
  },
  {
    title: '生物先验图',
    desc: '与 scFEA (Genome Research 2022)、通路子网络 (Nat Commun 2018) 相同的范式——用生物学约束结构化的图提升预测与可解释性。',
    color: '#00ccff',
  },
  {
    title: '可解释性',
    desc: '注意力权重作为可解释信号，与 Liò 教授的 Concept / Graph Convolutions 理念一致。',
    color: '#ffcc00',
  },
  {
    title: '机理 + ML 融合',
    desc: '将机理建模与图注意力结合，与 Neural ODE + 符号回归的融合方向相呼应。',
    color: '#ff3366',
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
            AI modeling, simulation execution, and user interaction into composable layers — with a{' '}
            <span className="text-emerald-400">TCGA 数据驱动</span> +{' '}
            <span className="text-cyan-400">GAT 图注意力代理</span> at its core.
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

        {/* TCGA → GAT → CAR-M pipeline story line */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/5 mb-3">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium uppercase">Data-Driven Story</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              From <span className="text-purple-400">TCGA</span> →{' '}
              <span className="text-emerald-400">GAT</span> →{' '}
              <span className="text-cyan-400">CAR-M</span>
            </h3>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {PIPELINE.map((p, idx) => (
              <div key={p.step} className="relative">
                <div
                  className="glass-panel rounded-xl p-5 border h-full transition-all duration-500 hover-lift"
                  style={{ borderColor: `${p.color}25`, backgroundColor: `${p.color}06` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-black font-mono"
                      style={{ color: p.color }}
                    >{p.step}</span>
                    <div
                      className="w-8 h-0.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                  </div>
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${p.color}12`, color: p.color }}
                  >
                    {p.icon}
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-2">{p.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
                {idx < PIPELINE.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards — enhanced */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
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

        {/* GAT technical params + Liò affinity */}
        <div className="grid md:grid-cols-2 gap-5 mb-16">
          {/* Technical params */}
          <div className="glass-panel rounded-xl p-6 gradient-border">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-cyan-400" />
              GAT Surrogate Specs
            </h3>
            <div className="space-y-3">
              {GAT_PARAMS.map((p) => (
                <div key={p.label} className="flex items-center justify-between gap-4 border-b border-slate-700/40 pb-2">
                  <span className="text-xs text-slate-400">{p.label}</span>
                  <span className="text-xs font-mono text-cyan-300 text-right">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liò affinity */}
          <div className="glass-panel rounded-xl p-6 gradient-border">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-400" />
              Aligned with Prof. Pietro Liò
            </h3>
            <div className="space-y-3">
              {LIO_AFFINITIES.map((a) => (
                <div key={a.title} className="flex items-start gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: a.color }}
                  />
                  <div>
                    <div className="text-xs font-semibold text-white">{a.title}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            <code>{`// Agent-Based Modeling Engine Core (GAT surrogate)
class ABMEngine {
  cells: Cell[];
  field: CytokineField;
  gat: GATModel;

  update(dt: number) {
    // 1. Update cytokine diffusion fields
    this.field.update(this.cells, dt);

    // 2. Build cell interaction graph (SpatialHash spatial neighbors)
    const graph = buildCellGraph(this.cells, this.field);

    // 3. Per-node GAT inference → M1/M2 + phagocytosis
    const pred = this.gat.forward(graph);

    // 4. Per-cell decision loop
    for (const cell of this.cells) {
      cell.applyPolarization(pred, cell.id);

      // CAR-mediated phagocytosis check
      if (cell.type === 'CAR_M' && cell.canPhagocytose(pred, cell.id)) {
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