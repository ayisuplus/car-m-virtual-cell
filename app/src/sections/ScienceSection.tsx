import React from 'react';
import { BookOpen, Brain, Microscope, Settings, Radio, Zap, Flame } from 'lucide-react';
import SciCarDiagram from '@/components/SciCarDiagram';
import PhagocytosisPathway from '@/components/PhagocytosisPathway';

export default function ScienceSection() {
  return (
    <section id="science" className="py-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/5 mb-4">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-purple-400 font-medium uppercase">Scientific Foundation</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            From <span className="text-rose-400">Biology</span> to <span className="text-cyan-400">Code</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Our simulation models three interconnected biological processes that determine CAR-M therapy success.
          </p>
        </div>

        {/* Science cards — enhanced with gradient borders and better hover */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* M1/M2 Polarization */}
          <div className="glass-panel rounded-xl overflow-hidden group hover:border-rose-400/40 transition-all duration-500 gradient-border hover-lift">
            <div className="h-48 overflow-hidden bg-slate-900/50 relative">
              <img
                src="/images/m1-m2-polarization.png"
                alt="Macrophage Polarization"
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-80" />
              {/* Animated accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-rose-400 pulse-dot" />
                <h3 className="text-lg font-semibold text-white group-hover:text-rose-300 transition-colors duration-300">M1/M2 Polarization</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Macrophages exist on a functional spectrum. M1 phenotype (pro-inflammatory, tumoricidal)
                vs. M2 phenotype (anti-inflammatory, pro-tumor). The TME drives M2 polarization through
                TGF-β, IL-10, and lactate accumulation.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 transition-colors cursor-default">IFN-γ</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors cursor-default">IL-4</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 transition-colors cursor-default">TNF-α</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors cursor-default">TGF-β</span>
              </div>
            </div>
          </div>

          {/* CAR Structure — Interactive SVG */}
          <div className="glass-panel rounded-xl overflow-hidden group hover:border-emerald-400/40 transition-all duration-500 gradient-border hover-lift md:col-span-2">
            <div className="p-4 bg-slate-900/50 relative overflow-hidden">
              <SciCarDiagram />
              {/* Animated corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors duration-300">CAR Engineering</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Hover each module to explore the receptor architecture. CAR-M combines an scFv antigen-binding domain with intracellular signaling domains (CD3ζ, FcRγ).
                Different domains trigger distinct effector programs — from enhanced phagocytosis to
                ECM degradation via MMP secretion.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors cursor-default">scFv</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors cursor-default">CD3ζ</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors cursor-default">FcRγ</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20 transition-colors cursor-default">HER2</span>
              </div>
            </div>
          </div>

          {/* Phagocytosis */}
          <div className="glass-panel rounded-xl overflow-hidden group hover:border-cyan-400/40 transition-all duration-500 gradient-border hover-lift">
            <div className="h-48 overflow-hidden bg-slate-900/50 relative">
              <img
                src="/images/phagocytosis-mechanism.png"
                alt="Phagocytosis Mechanism"
                className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors duration-300">Phagocytosis Control</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                The balance between "eat me" signals (FcγR, CR3) and "don't eat me" signals (CD47/SIRPα)
                determines tumor cell clearance. CAR-M engineering tips this balance by providing
                artificial activation while checkpoint blockade removes inhibition.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 transition-colors cursor-default">CD47</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/20 transition-colors cursor-default">SIRPα</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors cursor-default">FcγR</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20 transition-colors cursor-default">Syk</span>
              </div>
            </div>
          </div>

          {/* AI Virtual Tumor — enhanced */}
          <div className="glass-panel rounded-xl overflow-hidden group hover:border-yellow-400/40 transition-all duration-500 gradient-border hover-lift md:col-span-3">
            <div className="h-52 overflow-hidden bg-slate-900/50 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-purple-400/10" />
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255, 204, 0, 0.3) 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              />
              <Brain className="w-20 h-20 text-yellow-400/80 relative z-10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 ease-out" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent to-transparent opacity-80" />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 pulse-dot" />
                <h3 className="text-xl font-semibold text-white group-hover:text-yellow-300 transition-colors duration-300">AI Virtual Tumor — Next Frontier</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-4xl">
                In 2026, Prof. Zhang Zemin's team at Peking University proposed the 'AI Virtual Tumor' concept: integrating cell composition, spatial organization, intercellular communication, and perturbation response rules to build tumor-scale ecosystem models. Our CAR-M simulator is a concrete engineering implementation of this vision.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['CellForge', 'scFoundation', 'AIVC', 'Digital Twin'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 transition-colors cursor-default font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic">Immunity & Inflammation, 2026.06 — Zhang et al.</p>
            </div>
          </div>
        </div>

        {/* M1 vs M2 polarization comparison */}
        <div className="mt-16 grid md:grid-cols-2 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-xl border-l-4 border-red-400">
            <h4 className="text-sm font-bold text-red-400 mb-3">M1 — Classical Activation</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Induced by: IFN-γ, LPS, TNF-α</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Signaling: JAK/STAT1, NF-κB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Secretes: TNF-α, IL-12, ROS/RNS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Function: Anti-tumor, T cell activation</span>
              </div>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-xl border-l-4 border-cyan-400">
            <h4 className="text-sm font-bold text-cyan-400 mb-3">M2 — Alternative Activation</h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Induced by: IL-4, IL-10, TGF-β</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Signaling: STAT6, PI3K/AKT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Secretes: VEGF, IL-10, Arg1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Function: Pro-tumor, immunosuppression</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phagocytosis pathway — Interactive SVG */}
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h4 className="text-sm font-bold text-white mb-4">Phagocytosis Signaling Pathway</h4>
          <PhagocytosisPathway />
        </div>

        {/* CAR-M cascade diagram */}
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h4 className="text-sm font-bold text-white mb-4">CAR-M Effector Cascade</h4>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {[
              { label: 'CAR-M\nPhagocytosis', color: '#00ff88', Icon: Microscope },
              { label: 'Antigen\nProcessing', color: '#00ccff', Icon: Settings },
              { label: 'MHC\nPresentation', color: '#ffcc00', Icon: Radio },
              { label: 'CD8+ T Cell\nActivation', color: '#ff3366', Icon: Zap },
              { label: 'Tumor\nKilling', color: '#cc66ff', Icon: Flame },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div className="text-center flex-shrink-0">
                  <step.Icon className="w-6 h-6 mx-auto mb-1" style={{ color: step.color }} />
                  <div className="w-20 h-12 rounded-lg border flex items-center justify-center text-[9px] font-medium whitespace-pre-line leading-tight"
                       style={{ borderColor: step.color + '60', backgroundColor: step.color + '10', color: step.color }}>
                    {step.label}
                  </div>
                </div>
                {i < 4 && <div className="text-slate-500 flex-shrink-0">→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-12 leading-relaxed max-w-3xl mx-auto">
          This platform draws inspiration from recent breakthroughs: CellForge (Yale, 2026) for multi-agent model design, GigaTIME (Microsoft/Cell 2026) for virtual TME population modeling, and Lingshu-Cell (Alibaba DAMO, 2026) for whole-transcriptome virtual cell modeling.
        </p>
      </div>
    </section>
  );
}
