import { FlaskConical, Dna, Syringe, Snowflake, Target, Microscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CarDesign, SimParams, SignalingDomain, TargetAntigen } from '@/types/simulation';

interface PresetScenario {
  id: string;
  name: string;
  description: string;
  note?: string;
  icon: React.ReactNode;
  accent: string;
  simParams: SimParams;
  carDesign: CarDesign;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'ct-0508-baseline',
    name: 'CT-0508-Inspired Baseline',
    description: 'HER2-high solid tumor reference scenario',
    note: 'Uses CT-0508 as clinical context. This is a mechanism-informed simulation preset, not a calibrated reproduction of patient outcomes.',
    icon: <Microscope className="w-4 h-4" />,
    accent: '#00ccff',
    simParams: {
      carMCount: 12,
      tumorCount: 30,
      wildTypeCount: 15,
      cd8Count: 8,
      oxygenLevel: 0.6,
      lactateLevel: 0.3,
      tgfBetaLevel: 0.4,
      randomSeed: 20250706,
    },
    carDesign: {
      signalingDomain: 'CD3ζ' as SignalingDomain,
      targetAntigen: 'HER2' as TargetAntigen,
      affinity: 7,
      checkpointBlockade: { CD47_SIRPa: true, CD24_Siglec10: false },
    },
  },
  {
    id: 'her2-low',
    name: 'HER2 Low Expression',
    description: 'Lower antigen-density stress test',
    note: 'Explores how reduced antigen density and missing checkpoint blockade can lower simulated uptake.',
    icon: <Target className="w-4 h-4" />,
    accent: '#ff6644',
    simParams: {
      carMCount: 12,
      tumorCount: 30,
      wildTypeCount: 15,
      cd8Count: 8,
      oxygenLevel: 0.6,
      lactateLevel: 0.3,
      tgfBetaLevel: 0.7,
      randomSeed: 20250707,
    },
    carDesign: {
      signalingDomain: 'CD3ζ' as SignalingDomain,
      targetAntigen: 'HER2' as TargetAntigen,
      affinity: 4,
      checkpointBlockade: { CD47_SIRPa: false, CD24_Siglec10: false },
    },
  },
  {
    id: 'car-m-pd1-combo',
    name: 'CAR-M + Anti-PD-1 Combo',
    description: 'Combination therapy — enhanced T cell infiltration',
    note: 'CAR-M phagocytosis releases tumor antigens → T cell priming → PD-1 blockade sustains T cell activity. Simulates synergy.',
    icon: <Syringe className="w-4 h-4" />,
    accent: '#00ff88',
    simParams: {
      carMCount: 12,
      tumorCount: 25,
      wildTypeCount: 10,
      cd8Count: 20,
      oxygenLevel: 0.5,
      lactateLevel: 0.3,
      tgfBetaLevel: 0.3,
      randomSeed: 20250708,
    },
    carDesign: {
      signalingDomain: 'CD3ζ' as SignalingDomain,
      targetAntigen: 'HER2' as TargetAntigen,
      affinity: 7,
      checkpointBlockade: { CD47_SIRPa: true, CD24_Siglec10: false },
    },
  },
  {
    id: 'cd147-ecm',
    name: 'CD147 ECM Degradation',
    description: 'Dense stroma — CD147 CAR-M tunnels through ECM',
    note: 'CD147 signal domain upregulates MMPs. CAR-M cells create channels through ECM, enabling T cell infiltration into tumor core.',
    icon: <Dna className="w-4 h-4" />,
    accent: '#ffcc00',
    simParams: {
      carMCount: 12,
      tumorCount: 25,
      wildTypeCount: 10,
      cd8Count: 10,
      oxygenLevel: 0.4,
      lactateLevel: 0.3,
      tgfBetaLevel: 0.4,
      randomSeed: 20250709,
    },
    carDesign: {
      signalingDomain: 'CD147' as SignalingDomain,
      targetAntigen: 'HER2' as TargetAntigen,
      affinity: 6,
      checkpointBlockade: { CD47_SIRPa: true, CD24_Siglec10: false },
    },
  },
  {
    id: 'cold-tumor',
    name: 'Cold Tumor',
    description: 'Highly immunosuppressive — minimal immune infiltration',
    note: 'High TGF-β (0.8) + low oxygen + dense ECM. Tests whether CAR-M can convert a "cold" tumor to "hot" by remodeling the TME.',
    icon: <Snowflake className="w-4 h-4" />,
    accent: '#8b5cf6',
    simParams: {
      carMCount: 8,
      tumorCount: 40,
      wildTypeCount: 20,
      cd8Count: 3,
      oxygenLevel: 0.3,
      lactateLevel: 0.6,
      tgfBetaLevel: 0.8,
      randomSeed: 20250710,
    },
    carDesign: {
      signalingDomain: 'CD3ζ' as SignalingDomain,
      targetAntigen: 'HER2' as TargetAntigen,
      affinity: 7,
      checkpointBlockade: { CD47_SIRPa: true, CD24_Siglec10: false },
    },
  },
];

interface PresetScenariosProps {
  onSelect: (simParams: SimParams, carDesign: CarDesign) => void;
}

export default function PresetScenarios({ onSelect }: PresetScenariosProps) {
  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Preset Scenarios</h3>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {PRESET_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.simParams, scenario.carDesign)}
            className="text-left transition-all duration-200"
          >
            <Card
              className="border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 hover:shadow-md transition-all duration-200 overflow-hidden"
              style={{ borderLeftWidth: '4px', borderLeftColor: scenario.accent }}
            >
              <CardHeader className="p-3 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: scenario.accent }}>{scenario.icon}</span>
                    <CardTitle className="text-xs font-semibold text-slate-200">{scenario.name}</CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{ borderColor: scenario.accent + '40', color: scenario.accent }}
                  >
                    {scenario.carDesign.signalingDomain}
                  </Badge>
                </div>
                <CardDescription className="text-[10px] text-slate-400 leading-relaxed">
                  {scenario.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-2">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    style={{ color: '#00ff88', borderColor: '#00ff8840', backgroundColor: '#00ff8810' }}
                  >
                    CAR-M {scenario.simParams.carMCount}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    style={{ color: '#cc66ff', borderColor: '#cc66ff40', backgroundColor: '#cc66ff10' }}
                  >
                    Tumor {scenario.simParams.tumorCount}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    style={{ color: '#ffcc00', borderColor: '#ffcc0040', backgroundColor: '#ffcc0010' }}
                  >
                    CD8 {scenario.simParams.cd8Count}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    style={{
                      color: scenario.carDesign.checkpointBlockade.CD47_SIRPa ? '#a855f7' : '#64748b',
                      borderColor: (scenario.carDesign.checkpointBlockade.CD47_SIRPa ? '#a855f7' : '#64748b') + '40',
                      backgroundColor: (scenario.carDesign.checkpointBlockade.CD47_SIRPa ? '#a855f7' : '#64748b') + '10',
                    }}
                  >
                    {scenario.carDesign.checkpointBlockade.CD47_SIRPa ? 'α-CD47 ON' : 'α-CD47 OFF'}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    style={{ color: '#ff88cc', borderColor: '#ff88cc40', backgroundColor: '#ff88cc10' }}
                  >
                    TGF-β {(scenario.simParams.tgfBetaLevel * 100).toFixed(0)}%
                  </span>
                </div>
                {scenario.note && (
                  <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">{scenario.note}</div>
                )}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
