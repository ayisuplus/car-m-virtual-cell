import { BookOpen } from 'lucide-react';

const REFERENCES = [
  {
    authors: 'Zhang Z et al.',
    title: 'AI Virtual Tumor: From Cell Composition to Ecosystem Modeling.',
    journal: 'Immunity & Inflammation',
    year: '2026',
    desc: 'Proposed the AI Virtual Tumor framework integrating cell composition, spatial organization, and perturbation rules.',
  },
  {
    authors: 'Carisma Therapeutics.',
    title: 'CT-0508: First-in-Human Anti-HER2 CAR-M Clinical Trial.',
    journal: 'ClinicalTrials.gov',
    year: '2023-2025',
    desc: 'Landmark first-in-human trial demonstrating CAR-M safety with zero Grade ≥3 CRS.',
  },
  {
    authors: 'Yale CellForge Team.',
    title: 'CellForge: Multi-Agent Framework for Virtual Cell Model Design.',
    journal: 'bioRxiv',
    year: '2026',
    desc: 'Multi-agent AI system for autonomous design and optimization of virtual cell models.',
  },
  {
    authors: 'Microsoft Research & Allen Institute.',
    title: 'GigaTIME: Virtual TME Population Modeling at Scale.',
    journal: 'Cell',
    year: '2026',
    desc: 'Large-scale virtual tumor microenvironment population dynamics simulation.',
  },
  {
    authors: 'Alibaba DAMO Academy.',
    title: 'Lingshu-Cell: Whole-Transcriptome Virtual Cell Modeling.',
    journal: 'Nature Methods',
    year: '2026',
    desc: 'Foundation model for predicting single-cell transcriptomes from genomic context.',
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

        {/* References card */}
        <div className="glass-panel p-6 md:p-8 rounded-xl border-purple-400/20">
          <ol className="space-y-6">
            {REFERENCES.map((ref, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-xs font-mono text-purple-400">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed">
                    {ref.authors} {ref.title}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="text-cyan-400">{ref.journal}</span>
                    <span className="text-slate-500">, {ref.year}.</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{ref.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
