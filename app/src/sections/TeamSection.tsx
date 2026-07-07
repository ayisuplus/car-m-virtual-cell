import { Users, Target, FlaskConical, Code2, Star } from 'lucide-react';

const CARDS = [
  {
    title: 'Research Focus',
    icon: <Target className="w-4 h-4" />,
    color: '#f59e0b',
    items: [
      'Agent-Based Modeling of Tumor Microenvironment',
      'CAR-Macrophage Engineering & Optimization',
      'Neural Surrogate Acceleration for ABM',
      'AI-Guided Immunotherapy Design',
    ],
  },
  {
    title: 'Methodology',
    icon: <FlaskConical className="w-4 h-4" />,
    color: '#00ccff',
    items: [
      'Multi-scale simulation (molecular → cellular → tissue)',
      'PyTorch neural surrogate (>98% accuracy, 100x speedup)',
      'BioFVM-inspired cytokine diffusion',
      'scRNA-seq data integration pipeline',
    ],
  },
  {
    title: 'Inspiration & Tools',
    icon: <Star className="w-4 h-4" />,
    color: '#cc66ff',
    items: [
      'Carisma Therapeutics CT-0508 clinical data',
      'CZI Virtual Cell Initiative',
      'PhysiCell framework',
      'CellForge (Yale, 2026) multi-agent design',
      "Zhang Zemin 'AI Virtual Tumor' concept (2026)",
    ],
  },
  {
    title: 'Technical Stack',
    icon: <Code2 className="w-4 h-4" />,
    color: '#00ff88',
    items: [
      'React + TypeScript + Vite',
      'Canvas 2D + Three.js rendering',
      'Chart.js real-time analytics',
      'Tailwind CSS + shadcn/ui',
    ],
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="py-20 px-4 md:px-8 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/5 mb-4">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium uppercase">Research Team</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Cambridge Short-Term <span className="text-amber-400">Research Program</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Computational Immunology & Systems Biology
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="glass-panel p-6 rounded-xl hover:border-opacity-50 transition-all duration-300"
              style={{ borderColor: `${card.color}20` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15`, color: card.color }}
                >
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: card.color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
