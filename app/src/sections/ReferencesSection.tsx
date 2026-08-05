import { BookOpen } from 'lucide-react';

const REFERENCES = [
  {
    authors: 'Zhang Z et al.',
    title: 'Single-cell dissection of the tumor microenvironment (Virtual Tumor concept).',
    journal: 'Inflammation',
    year: '2026',
    desc: 'Review of TME single-cell research proposing the "virtual tumor" concept: integrating cell composition, spatial organization, and perturbation rules into tumor-scale ecosystem models.',
  },
  {
    authors: 'Carisma Therapeutics / Reiss KA et al.',
    title: 'CAR-macrophage therapy for HER2-overexpressing advanced solid tumors: a phase 1 trial (CT-0508).',
    journal: 'Nature Medicine',
    year: '2025',
    desc: 'First-in-human trial demonstrating CAR-M safety with zero Grade ≥3 CRS.',
  },
  {
    authors: 'Tang X et al.',
    title: 'CellForge: Agentic Design of Virtual Cell Models.',
    journal: 'arXiv:2508.02276',
    year: '2025',
    desc: 'Yale-led multi-agent system for autonomous design and optimization of virtual cell models.',
  },
  {
    authors: 'Valanarasu JMJ et al.',
    title: 'GigaTIME: Multimodal AI generates virtual population for tumor microenvironment modeling.',
    journal: 'Cell (Microsoft Research & Providence)',
    year: '2026',
    desc: 'Population-scale virtual TME modeling from routine pathology slides.',
  },
  {
    authors: 'Alibaba DAMO Academy (Zhang H et al.).',
    title: 'Lingshu-Cell: A Generative Cellular World Model for Transcriptome Modeling Toward Virtual Cells.',
    journal: 'arXiv:2603.25240',
    year: '2026',
    desc: 'Foundation model for single-cell transcriptome state distributions and perturbation responses.',
  },
  {
    authors: 'Ghaffarizadeh A et al.',
    title: 'PhysiCell: An Open Source Physics-Based Cell Simulator.',
    journal: 'PLoS Computational Biology',
    year: '2018',
    desc: 'Widely used open-source framework for 3D multicellular simulations with diffusion.',
  },
  {
    authors: 'CZI.',
    title: 'Toward a Virtual Cell.',
    journal: 'Chan Zuckerberg Initiative Science',
    year: '2024',
    desc: 'Roadmap for building comprehensive computational models of biological cells.',
  },
];

export default function ReferencesSection() {
  return (
    <section id="references" className="py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/5 mb-4">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-purple-400 font-medium uppercase">Scientific References</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            References & <span className="text-purple-400">Further Reading</span>
          </h2>
        </div>

        {/* References card — enhanced */}
        <div className="glass-panel p-6 md:p-8 rounded-xl gradient-border">
          <ol className="space-y-6">
            {REFERENCES.map((ref, index) => (
              <li key={index} className="flex gap-4 group">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-xs font-mono text-purple-400 group-hover:bg-purple-400/20 group-hover:border-purple-400/40 transition-all duration-300">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed group-hover:text-purple-100 transition-colors duration-300">
                    <span className="font-medium">{ref.authors}</span> {ref.title}
                  </p>
                  <p className="text-sm mt-1.5">
                    <span className="text-cyan-400 font-medium">{ref.journal}</span>
                    <span className="text-slate-500">, {ref.year}.</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{ref.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
