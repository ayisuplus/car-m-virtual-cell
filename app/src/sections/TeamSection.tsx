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

        {/* Cards grid — enhanced */}
        <div className="grid md:grid-cols-2 gap-6">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="glass-panel p-6 rounded-xl gradient-border hover-lift group relative overflow-hidden"
              style={{ borderColor: `${card.color}15` }}
            >
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ 
                  background: `radial-gradient(circle, ${card.color}10 0%, transparent 70%)`,
                  transform: 'translate(30%, -30%)'
                }} 
              />
              
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                  style={{ 
                    backgroundColor: `${card.color}12`,
                    color: card.color,
                    boxShadow: `0 0 20px ${card.color}10`
                  }}
                >
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors duration-300">{card.title}</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300 group-hover:text-slate-200 transition-colors duration-300">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 group-hover:scale-150 transition-transform duration-300"
                      style={{ backgroundColor: card.color }}
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              
              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
