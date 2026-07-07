import { useSim } from '@/context/SimContext';
import type { SignalingDomain, SimStatistics } from '@/types/simulation';

interface SimStatsExtras {
  killEvents?: number[];
}

type LegendStats = SimStatistics & SimStatsExtras;

const CELL_TYPES = [
  { label: 'CAR-M', color: '#00ff88', desc: 'Engineered macrophage with CAR' },
  { label: 'M1 Macrophage', color: '#ff3366', desc: 'Anti-tumor polarization' },
  { label: 'M2 Macrophage', color: '#00ccff', desc: 'Pro-tumor polarization' },
  { label: 'Tumor Cell', color: '#cc66ff', desc: 'Cancer cell (target antigen + CD47/CD24)' },
  { label: 'CD8+ T Cell', color: '#ffcc00', desc: 'Cytotoxic T lymphocyte' },
];

const DOMAIN_COLORS: Record<SignalingDomain, string> = {
  'CD3ζ': '#00ff88',
  'FcRγ': '#00ccff',
  CD147: '#ffcc00',
  MerTK: '#cc66ff',
};

export default function CellLegend() {
  const { state } = useSim();
  const stats = state.statistics as LegendStats;
  const hasData = stats.time.length > 0;
  const killEvents = hasData && Array.isArray(stats.killEvents)
    ? stats.killEvents[stats.killEvents.length - 1]
    : undefined;
  const domainColor = DOMAIN_COLORS[state.carDesign.signalingDomain];

  return (
    <div className="glass-panel p-3">
      <div className="text-[10px] text-slate-500 uppercase font-medium mb-2">Cell Legend</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {CELL_TYPES.map((cell) => (
          <div key={cell.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{
                backgroundColor: cell.color,
                boxShadow: `0 0 6px ${cell.color}66`,
              }}
            />
            <span className="text-[11px] text-slate-300">{cell.label}</span>
            <span className="text-[10px] text-slate-500">— {cell.desc}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{
              backgroundColor: domainColor,
              boxShadow: `0 0 6px ${domainColor}66`,
            }}
          />
          <span className="text-[10px] text-slate-400">CAR-M domain: {state.carDesign.signalingDomain}</span>
        </div>
        {killEvents !== undefined && (
          <div className="text-[10px] text-slate-400">
            Kill events: <span className="font-mono text-emerald-400">{killEvents}</span>
          </div>
        )}
      </div>
    </div>
  );
}
