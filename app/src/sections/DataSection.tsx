import { Activity, Dna, TrendingUp, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

// ── Cell type composition data ──
interface CellTypeEntry {
  name: string;
  COMB7: number;
  UTD: number;
}

const CELL_TYPES: CellTypeEntry[] = [
  { name: 'Fibroblast', COMB7: 6145, UTD: 3712 },
  { name: 'CD8+ T', COMB7: 1182, UTD: 652 },
  { name: 'NK', COMB7: 1485, UTD: 980 },
  { name: 'M1 Macro', COMB7: 1330, UTD: 1483 },
  { name: 'Monocyte', COMB7: 919, UTD: 5009 },
  { name: 'Tumor', COMB7: 305, UTD: 370 },
  { name: 'CD4+ T', COMB7: 211, UTD: 81 },
  { name: 'M2 Macro', COMB7: 42, UTD: 30 },
  { name: 'Unknown', COMB7: 73, UTD: 36 },
  { name: 'B Cell', COMB7: 40, UTD: 24 },
  { name: 'DC', COMB7: 14, UTD: 18 },
  { name: 'Macrophage', COMB7: 12, UTD: 38 },
];

// ── DE genes data ──
interface DEGene {
  gene: string;
  log2fc: number;
  neg_log10_pval: number;
  direction: string;
}

const TOP_DE_GENES: DEGene[] = [
  { gene: 'LINC02384', log2fc: 5.08, neg_log10_pval: 188.65, direction: 'up' },
  { gene: 'ADAMDEC1', log2fc: 4.91, neg_log10_pval: 254.03, direction: 'up' },
  { gene: 'NUPR1', log2fc: 3.22, neg_log10_pval: 231.19, direction: 'up' },
  { gene: 'CES1', log2fc: 3.17, neg_log10_pval: 182.89, direction: 'up' },
  { gene: 'CYP27B1', log2fc: 3.10, neg_log10_pval: 106.89, direction: 'up' },
  { gene: 'C17orf58', log2fc: 2.85, neg_log10_pval: 180.57, direction: 'up' },
  { gene: 'CLEC4E', log2fc: 2.77, neg_log10_pval: 157.29, direction: 'up' },
  { gene: 'ID3', log2fc: 2.71, neg_log10_pval: 123.12, direction: 'up' },
  { gene: 'CCL5', log2fc: 2.70, neg_log10_pval: 177.49, direction: 'up' },
  { gene: 'MGST1', log2fc: 2.24, neg_log10_pval: 182.93, direction: 'up' },
  { gene: 'CCR7', log2fc: 2.13, neg_log10_pval: 83.17, direction: 'up' },
  { gene: 'IDO1', log2fc: 1.99, neg_log10_pval: 249.40, direction: 'up' },
];

// First 50 DE genes for volcano plot
const VOLCANO_DATA: DEGene[] = [
  { gene: 'RPS27L', log2fc: 1.64, neg_log10_pval: 300, direction: 'up' },
  { gene: 'IFI6', log2fc: 1.84, neg_log10_pval: 257.96, direction: 'up' },
  { gene: 'ADAMDEC1', log2fc: 4.91, neg_log10_pval: 254.03, direction: 'up' },
  { gene: 'IDO1', log2fc: 1.99, neg_log10_pval: 249.40, direction: 'up' },
  { gene: 'CTSH', log2fc: 1.67, neg_log10_pval: 241.86, direction: 'up' },
  { gene: 'BAX', log2fc: 1.55, neg_log10_pval: 232.49, direction: 'up' },
  { gene: 'NUPR1', log2fc: 3.22, neg_log10_pval: 231.19, direction: 'up' },
  { gene: 'CAPG', log2fc: 1.52, neg_log10_pval: 217.81, direction: 'up' },
  { gene: 'BRI3', log2fc: 0.83, neg_log10_pval: 208.06, direction: 'ns' },
  { gene: 'JUNB', log2fc: 1.32, neg_log10_pval: 207.06, direction: 'up' },
  { gene: 'HLA-A', log2fc: 0.77, neg_log10_pval: 206.93, direction: 'ns' },
  { gene: 'RPS19', log2fc: 0.88, neg_log10_pval: 201.09, direction: 'ns' },
  { gene: 'CTSD', log2fc: 1.40, neg_log10_pval: 194.51, direction: 'up' },
  { gene: 'CYB5A', log2fc: 1.17, neg_log10_pval: 192.24, direction: 'up' },
  { gene: 'LINC02384', log2fc: 5.08, neg_log10_pval: 188.65, direction: 'up' },
  { gene: 'NR4A2', log2fc: 1.70, neg_log10_pval: 187.45, direction: 'up' },
  { gene: 'MGST1', log2fc: 2.24, neg_log10_pval: 182.93, direction: 'up' },
  { gene: 'CES1', log2fc: 3.17, neg_log10_pval: 182.89, direction: 'up' },
  { gene: 'C17orf58', log2fc: 2.85, neg_log10_pval: 180.57, direction: 'up' },
  { gene: 'CD81', log2fc: 1.12, neg_log10_pval: 178.35, direction: 'up' },
  { gene: 'CCL5', log2fc: 2.70, neg_log10_pval: 177.49, direction: 'up' },
  { gene: 'IFI30', log2fc: 0.85, neg_log10_pval: 169.70, direction: 'ns' },
  { gene: 'GLRX', log2fc: 1.20, neg_log10_pval: 169.33, direction: 'up' },
  { gene: 'ATOX1', log2fc: 1.13, neg_log10_pval: 162.30, direction: 'up' },
  { gene: 'CLEC4E', log2fc: 2.77, neg_log10_pval: 157.29, direction: 'up' },
  { gene: 'PSMB9', log2fc: 0.84, neg_log10_pval: 149.61, direction: 'ns' },
  { gene: 'GPX4', log2fc: 1.02, neg_log10_pval: 148.60, direction: 'up' },
  { gene: 'NFIL3', log2fc: 1.50, neg_log10_pval: 147.75, direction: 'up' },
  { gene: 'RBX1', log2fc: 0.73, neg_log10_pval: 141.60, direction: 'ns' },
  { gene: 'ATP5MG', log2fc: 0.68, neg_log10_pval: 141.52, direction: 'ns' },
  { gene: 'IFIT3', log2fc: 1.63, neg_log10_pval: 138.44, direction: 'up' },
  { gene: 'TMEM35B', log2fc: 1.34, neg_log10_pval: 132.89, direction: 'up' },
  { gene: 'IRF1', log2fc: 1.40, neg_log10_pval: 129.25, direction: 'up' },
  { gene: 'LSP1', log2fc: 1.53, neg_log10_pval: 126.54, direction: 'up' },
  { gene: 'TKT', log2fc: 1.29, neg_log10_pval: 126.43, direction: 'up' },
  { gene: 'SLC7A7', log2fc: 1.07, neg_log10_pval: 123.45, direction: 'up' },
  { gene: 'METTL9', log2fc: 1.51, neg_log10_pval: 123.43, direction: 'up' },
  { gene: 'ID3', log2fc: 2.71, neg_log10_pval: 123.12, direction: 'up' },
  { gene: 'CD48', log2fc: 1.33, neg_log10_pval: 121.95, direction: 'up' },
  { gene: 'LGALS2', log2fc: 2.40, neg_log10_pval: 119.06, direction: 'up' },
  { gene: 'DUSP10', log2fc: 1.79, neg_log10_pval: 116.62, direction: 'up' },
  { gene: 'NCF1', log2fc: 1.51, neg_log10_pval: 114.52, direction: 'up' },
  { gene: 'IL4I1', log2fc: 1.65, neg_log10_pval: 112.17, direction: 'up' },
  { gene: 'ZFAND5', log2fc: 1.11, neg_log10_pval: 110.69, direction: 'up' },
  { gene: 'CYP27B1', log2fc: 3.10, neg_log10_pval: 106.89, direction: 'up' },
  { gene: 'EMC7', log2fc: 1.12, neg_log10_pval: 105.20, direction: 'up' },
  { gene: 'TXNIP', log2fc: 1.52, neg_log10_pval: 104.20, direction: 'up' },
  { gene: 'CHCHD10', log2fc: 1.13, neg_log10_pval: 102.63, direction: 'up' },
  { gene: 'ALDH2', log2fc: 1.03, neg_log10_pval: 102.03, direction: 'up' },
  { gene: 'TALDO1', log2fc: 0.85, neg_log10_pval: 101.19, direction: 'ns' },
];

const upGenes = VOLCANO_DATA.filter(d => d.direction === 'up');
const nsGenes = VOLCANO_DATA.filter(d => d.direction !== 'up');

// ── Custom tooltip ──
function CellTypeTooltip({
  active, payload, label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload) return null;
  return (
    <div className="glass-panel px-3 py-2 rounded-lg text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function VolcanoTooltip({
  active, payload,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload as DEGene | undefined;
  if (!d) return null;
  return (
    <div className="glass-panel px-3 py-2 rounded-lg text-xs shadow-lg">
      <p className="text-white font-semibold mb-1">{d.gene}</p>
      <p className="text-slate-300">log₂FC: {d.log2fc.toFixed(2)}</p>
      <p className="text-slate-300">-log₁₀(p): {d.neg_log10_pval.toFixed(1)}</p>
      <p className={d.direction === 'up' ? 'text-rose-400' : 'text-slate-500'}>
        {d.direction.toUpperCase()}
      </p>
    </div>
  );
}

// ── Colors ──
const PURPLE = '#a855f7';
const ROSE = '#f43f5e';
const CYAN = '#06b6d4';
const SLATE = '#64748b';

// ── Component ──
export default function DataSection() {
  return (
    <section id="data" className="py-20 px-4 md:px-8 bg-slate-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-400/30 bg-purple-400/5 mb-4">
            <Dna className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-purple-400 font-medium uppercase">scRNA-seq Data</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tumor Microenvironment at <span className="text-purple-400">Single-Cell</span> Resolution
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Cell composition and differential expression analysis from GSE289149 —
            CAR-M treated (COMB7) vs untransduced (UTD) macrophages in HER2+ solid tumors.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Cell Type Composition */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cell Type Composition
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={CELL_TYPES} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <Tooltip content={<CellTypeTooltip />} cursor={{ fill: '#1e293b' }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
                />
                <Bar dataKey="COMB7" name="COMB7 (CAR-M)" fill={PURPLE} radius={[3, 3, 0, 0]} />
                <Bar dataKey="UTD" name="UTD (Control)" fill={CYAN} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top DE Genes */}
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Differentially Expressed Genes
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={TOP_DE_GENES}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  label={{ value: 'log₂ Fold Change', position: 'bottom', fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="gene"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="log2fc" name="log₂FC" radius={[0, 3, 3, 0]}>
                  {TOP_DE_GENES.map((entry) => (
                    <Cell
                      key={entry.gene}
                      fill={entry.direction === 'up' ? ROSE : SLATE}
                      fillOpacity={Math.min(1, entry.log2fc / 5)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volcano Plot — full width */}
        <div className="glass-panel p-6 rounded-xl mb-8">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Differential Expression Volcano Plot
          </h3>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="log2fc"
                name="log₂FC"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                label={{ value: 'log₂ Fold Change', position: 'bottom', fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="neg_log10_pval"
                name="-log₁₀(p-value)"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                label={{ value: '-log₁₀(p-value)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12, dx: 10 }}
              />
              <Tooltip content={<VolcanoTooltip />} cursor={{ stroke: '#334155', strokeDasharray: '3 3' }} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
              />
              <Scatter name="Upregulated" data={upGenes} fill={ROSE} fillOpacity={0.7} shape="circle" />
              <Scatter name="Not significant" data={nsGenes} fill={SLATE} fillOpacity={0.4} shape="circle" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[10px] text-slate-500">
              Genes with p-value near zero shown at -log₁₀(p) = 300 (capped). All displayed genes have adjusted p &lt; 0.001.
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              n = {VOLCANO_DATA.length} genes
            </span>
          </div>
        </div>

        {/* Data source footer */}
        <div className="glass-panel p-4 rounded-xl border-purple-400/20 bg-purple-400/5">
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-300 font-medium">GSE289149 — COMB7 vs UTD Macrophage scRNA-seq</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Cell type proportions and differential expression from CAR-M treated (COMB7) vs untransduced (UTD) conditions.
                Raw data processed with Scanpy. Visualized with Recharts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
