import { useMemo } from 'react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Activity, Dna, TrendingUp, Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, Tooltip, Legend);

// ── Cell type composition data ──
const CELL_TYPES = [
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

// Volcano data (first 50 DE genes)
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

// ── Shared chart styles ──
const PURPLE = '#a855f7';
const ROSE = '#f43f5e';
const CYAN = '#06b6d4';
const SLATE = '#64748b';

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  titleColor: '#a855f7',
  bodyColor: '#e2e8f0',
  borderColor: 'rgba(168, 85, 247, 0.2)',
  borderWidth: 1,
  padding: 8,
  titleFont: { size: 11, family: 'monospace' as const },
  bodyFont: { size: 11 },
};

const axisStyle = {
  grid: { color: 'rgba(168, 85, 247, 0.08)' },
  ticks: { color: '#94a3b8', font: { size: 11 } },
  border: { color: '#334155' },
};

// ── Chart data builders ──

function useCellTypeData() {
  return useMemo(() => ({
    labels: CELL_TYPES.map(d => d.name),
    datasets: [
      {
        label: 'COMB7 (CAR-M)',
        data: CELL_TYPES.map(d => d.COMB7),
        backgroundColor: `${PURPLE}cc`,
        borderColor: PURPLE,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'UTD (Control)',
        data: CELL_TYPES.map(d => d.UTD),
        backgroundColor: `${CYAN}cc`,
        borderColor: CYAN,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }), []);
}

function useDEGeneData() {
  return useMemo(() => ({
    labels: TOP_DE_GENES.map(d => d.gene),
    datasets: [{
      label: 'log₂FC',
      data: TOP_DE_GENES.map(d => d.log2fc),
      backgroundColor: TOP_DE_GENES.map(d =>
        d.direction === 'up' ? `${ROSE}cc` : `${SLATE}cc`
      ),
      borderColor: TOP_DE_GENES.map(d =>
        d.direction === 'up' ? ROSE : SLATE
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), []);
}

function useVolcanoData() {
  return useMemo(() => {
    const upGenes = VOLCANO_DATA.filter(d => d.direction === 'up');
    const nsGenes = VOLCANO_DATA.filter(d => d.direction !== 'up');
    return {
      datasets: [
        {
          label: 'Upregulated',
          data: upGenes.map(d => ({ x: d.log2fc, y: d.neg_log10_pval })),
          backgroundColor: `${ROSE}cc`,
          borderColor: ROSE,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Not significant',
          data: nsGenes.map(d => ({ x: d.log2fc, y: d.neg_log10_pval })),
          backgroundColor: `${SLATE}99`,
          borderColor: SLATE,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, []);
}

// ── Chart options ──

const cellTypeOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
    tooltip: tooltipStyle,
  },
  scales: {
    x: { ...axisStyle, ticks: { ...axisStyle.ticks, maxRotation: 45 } },
    y: axisStyle,
  },
};

const deGeneOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: tooltipStyle,
  },
  scales: {
    x: { ...axisStyle, title: { display: true, text: 'log₂ Fold Change', color: '#94a3b8', font: { size: 11 } } },
    y: { ...axisStyle, ticks: { ...axisStyle.ticks, font: { size: 11, family: 'monospace' as const } } },
  },
};

const volcanoOptions: ChartOptions<'scatter'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
    tooltip: tooltipStyle,
  },
  scales: {
    x: {
      ...axisStyle,
      title: { display: true, text: 'log₂ Fold Change', color: '#94a3b8', font: { size: 12 } },
    },
    y: {
      ...axisStyle,
      title: { display: true, text: '-log₁₀(p-value)', color: '#94a3b8', font: { size: 12 } },
    },
  },
};

// ── Component ──
export default function DataSection() {
  const cellTypeData = useCellTypeData();
  const deGeneData = useDEGeneData();
  const volcanoData = useVolcanoData();

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
          <div className="glass-panel p-6 rounded-xl gradient-border hover-lift group">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Cell Type Composition
            </h3>
            <div className="h-[350px]">
              <Bar data={cellTypeData} options={cellTypeOptions} />
            </div>
          </div>

          {/* Top DE Genes */}
          <div className="glass-panel p-6 rounded-xl gradient-border hover-lift group">
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Differentially Expressed Genes
            </h3>
            <div className="h-[350px]">
              <Bar data={deGeneData} options={deGeneOptions} />
            </div>
          </div>
        </div>

        {/* Volcano Plot — full width */}
        <div className="glass-panel p-6 rounded-xl mb-8 gradient-border hover-lift">
          <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Differential Expression Volcano Plot
          </h3>
          <div className="h-[420px]">
            <Scatter data={volcanoData} options={volcanoOptions} />
          </div>
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800/50">
            <p className="text-[11px] text-slate-500">
              Genes with p-value near zero shown at -log₁₀(p) = 300 (capped). All displayed genes have adjusted p &lt; 0.001.
            </p>
            <span className="text-[11px] text-slate-500 font-mono px-3 py-1 rounded-full bg-slate-800/50">
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
                Raw data processed with Scanpy. Visualized with Chart.js.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
