import { Dna, Shield, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSim } from '@/context/SimContext';
import type { SignalingDomain, TargetAntigen } from '@/types/simulation';

const DOMAIN_EFFECTS: Record<SignalingDomain, { title: string; effect: string; color: string }> = {
  'CD3ζ': {
    title: 'Classic ITAM Signaling',
    effect: 'Triggers phagocytosis via Syk kinase -> Rac1/Cdc42 -> actin polymerization. Fast uptake animation; CD3ζ is used as the CT-0508-inspired reference.',
    color: '#00ff88',
  },
  'FcRγ': {
    title: 'Fc Receptor γ Chain',
    effect: 'Similar to CD3ζ but uses FcγR pathway. Slightly different downstream signaling. Comparable simulated phagocytosis efficiency.',
    color: '#00ccff',
  },
  'CD147': {
    title: 'ECM Degradation Specialist',
    effect: 'Upregulates MMP secretion to degrade extracellular matrix. Does NOT trigger phagocytosis. Enables immune cell infiltration into dense tumors.',
    color: '#ffcc00',
  },
  'MerTK': {
    title: 'Efferocytosis Receptor',
    effect: 'Specializes in clearing apoptotic/dying cells (viability <40%). Slower uptake (4-6s) but works regardless of M1/M2 polarization.',
    color: '#cc66ff',
  },
};

const SIGNALING_DOMAINS: { value: SignalingDomain; label: string; desc: string }[] = [
  { value: 'CD3ζ', label: 'CD3ζ', desc: 'Classic ITAM signaling' },
  { value: 'FcRγ', label: 'FcRγ', desc: 'Fc receptor γ chain' },
  { value: 'CD147', label: 'CD147', desc: 'ECM degradation (MMPs)' },
  { value: 'MerTK', label: 'MerTK', desc: 'Efferocytosis-like program' },
];

const TARGET_ANTIGENS: { value: TargetAntigen; label: string }[] = [
  { value: 'HER2', label: 'HER2 (Breast/Gastric)' },
  { value: 'CD19', label: 'CD19 (Hematologic)' },
  { value: 'EGFR', label: 'EGFR (Solid Tumors)' },
];

export default function CarDesigner() {
  const { state, updateCarDesign } = useSim();

  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      <div className="flex items-center gap-2">
        <Dna className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">CAR-M Designer</h3>
      </div>

      {/* Signaling Domain Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400">Signaling Domain</label>
        <div className="grid grid-cols-2 gap-2">
          {SIGNALING_DOMAINS.map((domain) => (
            <button
              key={domain.value}
              onClick={() => updateCarDesign({ signalingDomain: domain.value })}
              className={`p-2.5 rounded-md border text-left transition-all duration-200 ${
                state.carDesign.signalingDomain === domain.value
                  ? 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_10px_rgba(0,204,255,0.15)]'
                  : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
              }`}
            >
              <div className="text-xs font-semibold text-slate-200">{domain.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{domain.desc}</div>
            </button>
          ))}
        </div>

        {/* Domain Effect */}
        <DomainEffect domain={state.carDesign.signalingDomain} />
      </div>

      {/* Target Antigen */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Target className="w-3 h-3" />
          Target Antigen
        </label>
        <div className="space-y-1.5">
          {TARGET_ANTIGENS.map((ag) => (
            <button
              key={ag.value}
              onClick={() => updateCarDesign({ targetAntigen: ag.value })}
              className={`w-full p-2 rounded-md border text-left text-xs transition-all duration-200 ${
                state.carDesign.targetAntigen === ag.value
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300'
                  : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600/50'
              }`}
            >
              {ag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Affinity Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">CAR Affinity</span>
          <span className="font-mono text-emerald-400">{state.carDesign.affinity}/10</span>
        </div>
        <Slider
          value={[state.carDesign.affinity]}
          onValueChange={(v) => updateCarDesign({ affinity: v[0] })}
          min={1}
          max={10}
          step={1}
          className="[&_[role=slider]]:bg-emerald-400"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* Checkpoint Blockade */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Checkpoint Blockade
        </label>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-300">CD47 / SIRPα</div>
            <div className="text-[10px] text-slate-500">Block "don't eat me" signal</div>
          </div>
          <Switch
            checked={state.carDesign.checkpointBlockade.CD47_SIRPa}
            onCheckedChange={(checked) =>
              updateCarDesign({
                checkpointBlockade: { ...state.carDesign.checkpointBlockade, CD47_SIRPa: checked },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs text-slate-300">CD24 / Siglec-10</div>
            <div className="text-[10px] text-slate-500">Secondary "don't eat me" signal in phagocytosis probability</div>
        </div>
          <Switch
            checked={state.carDesign.checkpointBlockade.CD24_Siglec10}
            onCheckedChange={(checked) =>
              updateCarDesign({
                checkpointBlockade: { ...state.carDesign.checkpointBlockade, CD24_Siglec10: checked },
              })
            }
          />
        </div>
      </div>

      {/* Design Summary */}
      <div className="mt-3 p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
        <div className="text-[10px] text-slate-500 uppercase mb-2">Design Summary</div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Domain:</span>
            <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-400">
              {state.carDesign.signalingDomain}
            </Badge>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Target:</span>
            <Badge variant="outline" className="text-[10px] border-purple-400/40 text-purple-400">
              {state.carDesign.targetAntigen}
            </Badge>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">CD47 Block:</span>
            <span className={state.carDesign.checkpointBlockade.CD47_SIRPa ? 'text-emerald-400' : 'text-red-400'}>
              {state.carDesign.checkpointBlockade.CD47_SIRPa ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainEffect({ domain }: { domain: SignalingDomain }) {
  const effect = DOMAIN_EFFECTS[domain];
  return (
    <div className="p-3 rounded-md border border-slate-700/50 bg-slate-800/20">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: effect.color }} />
        <span className="text-xs font-semibold" style={{ color: effect.color }}>{effect.title}</span>
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed">{effect.effect}</p>
    </div>
  );
}
