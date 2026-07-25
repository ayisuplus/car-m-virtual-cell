import { FlaskConical, TrendingUp, Shield, Users, Microscope, Calendar, Dna } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCountUp, useIntersectionObserver } from '@/lib/useCountUp';

interface StatConfig {
  metric: string;
  value: string;
  desc: string;
  icon: React.ReactNode;
  target: number;
  prefix?: string;
  suffix?: string;
}

const CT0508_DATA: StatConfig[] = [
  { metric: 'Patients', value: '14', desc: 'HER2+ solid tumors', icon: <Users className="w-4 h-4" />, target: 14 },
  { metric: 'CRS \u2265G3', value: '0%', desc: 'Safety advantage over CAR-T', icon: <Shield className="w-4 h-4" />, target: 0, suffix: '%' },
  { metric: 'Stable Disease', value: '44%', desc: 'HER2 IHC 3+ cohort', icon: <TrendingUp className="w-4 h-4" />, target: 44, suffix: '%' },
  { metric: 'Tumor Reduction', value: '\u221220%', desc: 'Best response (breast)', icon: <Microscope className="w-4 h-4" />, target: 20, prefix: '\u2212', suffix: '%' },
];

function CountUpStat({ config, isVisible }: { config: StatConfig; isVisible: boolean }) {
  const animatedValue = useCountUp(config.target, 1500, isVisible);

  const displayValue = config.target === 0 && config.suffix
    ? `${config.prefix ?? ''}0${config.suffix}`
    : `${config.prefix ?? ''}${animatedValue}${config.suffix ?? ''}`;

  return (
    <div className="text-3xl font-bold font-mono text-white mb-1">
      {displayValue}
    </div>
  );
}

const CHALLENGES = [
  { label: 'Persistence', value: 27, color: '#ff3366', desc: '27% detectable at 4 weeks' },
  { label: 'Infiltration', value: 45, color: '#ffcc00', desc: 'Limited tumor penetration' },
  { label: 'Antigen Density', value: 70, color: '#00ccff', desc: 'HER2 3+ required' },
];

const TIMELINE = [
  { stage: 'Discovery', detail: 'CAR-M concept \u0026 first in vitro models', year: '2010s' },
  { stage: 'Preclinical', detail: 'Anti-tumor efficacy in solid tumor models', year: '2017–2020' },
  { stage: 'CT-0508 Phase 1', detail: 'First-in-human anti-HER2 CAR-M clinical context', year: '2023–2025' },
  { stage: 'CT-0525', detail: 'Next-generation CAR-monocyte program direction', year: '2024+' },
];

const COMPARISON = [
  { feature: 'CRS Grade ≥3', carM: '0%', carT: '~5–30%' },
  { feature: 'ICANS / Neurotoxicity', carM: 'Not reported', carT: '~10–30%' },
  { feature: 'Lymphodepletion', carM: 'Not required', carT: 'Required' },
  { feature: 'Solid tumor efficacy', carM: 'Early signals', carT: 'Limited' },
  { feature: 'B cell aplasia', carM: 'No', carT: 'Yes (CD19 targets)' },
];

export default function ClinicalSection() {
  const { ref: statsRef, isVisible } = useIntersectionObserver(0.3);

  return (
    <section id="clinical" className="py-20 px-4 md:px-8 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/5 mb-4">
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium uppercase">Clinical Context</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            CT-0508: <span className="text-emerald-400">First-in-Human</span> CAR-M Trial
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            CT-0508 provides a useful clinical reference for CAR-M safety, antigen-density dependence,
            and TME remodeling hypotheses. The simulator uses these findings as context, not as a calibrated
            clinical predictor.
          </p>
        </div>

        {/* Key stats — enhanced */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {CT0508_DATA.map((item) => (
            <div
              key={item.metric}
              className="glass-panel p-5 rounded-xl text-center gradient-border hover-lift group"
            >
              <div className="flex justify-center mb-3 text-emerald-400 group-hover:scale-110 transition-transform duration-500">{item.icon}</div>
              <CountUpStat config={item} isVisible={isVisible} />
              <div className="text-sm font-medium text-slate-300 mb-1">{item.metric}</div>
              <div className="text-[11px] text-slate-500">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* CAR-M vs CAR-T comparison */}
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
            CAR-M vs CAR-T: Safety Profile
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Feature</TableHead>
                  <TableHead className="text-emerald-400">CAR-M (CT-0508)</TableHead>
                  <TableHead className="text-slate-300">CAR-T (typical)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON.map((row) => (
                  <TableRow key={row.feature} className="border-slate-700/50">
                    <TableCell className="text-xs text-slate-300">{row.feature}</TableCell>
                    <TableCell className="text-xs font-medium text-emerald-400">{row.carM}</TableCell>
                    <TableCell className="text-xs text-slate-400">{row.carT}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            CAR-M Development Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIMELINE.map((item, index) => (
              <div key={item.stage} className="relative">
                {index < TIMELINE.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px bg-slate-700/50" />
                )}
                <div className="text-[10px] text-emerald-400 font-mono mb-1">{item.year}</div>
                <div className="text-sm font-semibold text-white mb-1">{item.stage}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* TME Ecosystem Image */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="relative h-64 md:h-80">
              <img
                src="/images/tme-ecosystem.png"
                alt="Tumor Microenvironment Ecosystem"
                className="w-full h-full object-contain p-4"
              />
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#0a0f1a] to-transparent" />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Tumor Microenvironment</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The TME presents multiple barriers to CAR-M therapy: metabolic suppression (hypoxia, lactate),
                cytokine-mediated M2 polarization (TGF-β, IL-10), physical ECM barriers, and immunosuppressive
                cell populations (Tregs, MDSCs). This prototype captures a simplified subset of those interactions.
              </p>
            </div>
          </div>

          {/* Challenges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Key Clinical Challenges</h3>

            {CHALLENGES.map((challenge) => (
              <div key={challenge.label} className="glass-panel p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">{challenge.label}</span>
                  <span className="text-sm font-mono" style={{ color: challenge.color }}>
                    {challenge.value}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${challenge.value}%`,
                      backgroundColor: challenge.color,
                      boxShadow: `0 0 10px ${challenge.color}40`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">{challenge.desc}</p>
              </div>
            ))}

            {/* Safety advantage */}
            <div className="glass-panel p-4 rounded-lg border-emerald-400/30 bg-emerald-400/5">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Safety Advantage</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                In early CT-0508 reporting, CAR-M showed <span className="text-emerald-400 font-medium">zero Grade ≥3 CRS</span>,
                no reported ICANS, and no lymphodepletion requirement. These observations motivate
                combination-strategy exploration.
              </p>
            </div>

            {/* Mechanism */}
            <div className="glass-panel p-4 rounded-lg border-cyan-400/30 bg-cyan-400/5">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">Phagocytosis-Presentation-Activation Cascade</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                CAR-M kills tumors through direct phagocytosis, then presents tumor antigens to activate
                CD8+ T cells — a proposed path for converting "cold" tumors to "hot". This cascade is represented
                as a simplified mechanism in the ABM model.
              </p>
            </div>
          </div>
        </div>

        {/* What the simulation shows */}
        <div className="glass-panel p-6 rounded-xl border-emerald-400/30 bg-emerald-400/5">
          <div className="flex items-center gap-2 mb-4">
            <Dna className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              What the Simulation Explores
            </h3>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            The model explores a CT-0508-inspired mechanism: CAR-M infiltration can increase tumor phagocytosis,
            reduce simulated tumor-cell counts, and shift macrophage polarization toward M1 under permissive TME
            conditions. Antigen density, checkpoint blockade, and signaling-domain choices are adjustable assumptions,
            so outputs should be read as hypothesis-generating trends rather than clinical efficacy predictions.
          </p>
        </div>
      </div>
    </section>
  );
}
