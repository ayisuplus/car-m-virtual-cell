import { useEffect, useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Database, Loader2, AlertTriangle, Users, Target, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AttentionHeatmap from '@/components/AttentionHeatmap';
import {
  loadTcgaPredictions,
  computeTcgaStats,
  type TcgaStats,
} from '@/lib/tcgaDataLoader';
import type { TcgaReferenceData } from '@/types/simulation';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const MAX_SAMPLES = 30;
const MAX_STACK_CELLS = 8;

/** 免疫细胞颜色调色板（不透明，保证堆叠清晰）。 */
const CELL_COLORS = [
  '#00ccff', '#ff3366', '#00ff88', '#ffcc00', '#cc66ff', '#ff88cc',
  '#4dd0ff', '#ff8844', '#a3e635', '#f472b6', '#22d3ee', '#fb7185',
  '#34d399', '#fbbf24', '#c084fc', '#fda4af', '#38bdf8', '#86efac',
  '#fcd34d', '#e879f9', '#5eead4', '#fca5a5',
];

const SUBTYPE_META: Record<string, { label: string; color: string }> = {
  high_immune: { label: '高免疫', color: '#00ff88' },
  low_immune: { label: '低免疫', color: '#ff3366' },
  normal: { label: '正常', color: '#00ccff' },
};

const SUBTYPE_ORDER = ['high_immune', 'low_immune', 'normal'];

export default function TcgaReferencePanel() {
  const [predData, setPredData] = useState<TcgaReferenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // 注意力热图由 AttentionHeatmap 组件自行加载，这里只取预测数据。
    loadTcgaPredictions()
      .then((p) => {
        if (!cancelled) {
          setPredData(p);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载 TCGA 数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: TcgaStats | null = useMemo(
    () => (predData ? computeTcgaStats(predData) : null),
    [predData],
  );

  interface StackDataset {
    label: string;
    data: number[];
    backgroundColor: string;
    borderWidth: number;
  }

  // 堆叠柱状图：按免疫亚型排序（高→低→正常），显示前 MAX_SAMPLES 个患者。
  const { stackLabels, stackDatasets } = useMemo(() => {
    if (!predData || !stats) return { stackLabels: [], stackDatasets: [] as StackDataset[] };
    const preds = [...predData.predictions];
    const rank: Record<string, number> = {};
    SUBTYPE_ORDER.forEach((s, i) => {
      rank[s] = i;
    });
    preds.sort((a, b) => (rank[a.immune_subtype] ?? 9) - (rank[b.immune_subtype] ?? 9));

    // 选 top MAX_STACK_CELLS 免疫细胞类型 + 其余聚合为 Other
    const cellTypes = stats.immuneCellTypes;
    const meanPerCell = cellTypes.map((_, d) => stats.meanImmuneInfiltration[d] ?? 0);
    const topIdx = meanPerCell
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v)
      .slice(0, MAX_STACK_CELLS)
      .map((o) => o.i)
      .sort((a, b) => a - b);
    const topNames = topIdx.map((i) => cellTypes[i]);
    const otherIdx = cellTypes.map((_, i) => i).filter((i) => !topIdx.includes(i));

    const samples = preds.slice(0, MAX_SAMPLES);
    const labels = samples.map((p) => p.sample_id.replace('TCGA-BRCA-', ''));

    const datasets = topNames.map((name, di) => ({
      label: name,
      data: samples.map((p) => p.immune_infiltration[topIdx[di]] ?? 0),
      backgroundColor: CELL_COLORS[di % CELL_COLORS.length],
      borderWidth: 0,
    }));
    datasets.push({
      label: 'Other',
      data: samples.map((p) =>
        otherIdx.reduce((acc, i) => acc + (p.immune_infiltration[i] ?? 0), 0),
      ),
      backgroundColor: '#475569',
      borderWidth: 0,
    });
    return { stackLabels: labels, stackDatasets: datasets };
  }, [predData, stats]);

  // 免疫亚型分布（环形图）
  const subtypeChart = useMemo(() => {
    if (!stats) return null;
    const labels = SUBTYPE_ORDER.map(
      (s) => SUBTYPE_META[s]?.label ?? s,
    );
    const counts = SUBTYPE_ORDER.map((s) => stats.subtypeDistribution[s] ?? 0);
    const colors = SUBTYPE_ORDER.map((s) => SUBTYPE_META[s]?.color ?? '#64748b');
    return { labels, counts, colors };
  }, [stats]);

  // 生存风险分布（直方图，10 个桶）
  const riskHistogram = useMemo(() => {
    if (!predData) return { bins: [] as string[], counts: [] as number[] };
    const bins = 10;
    const counts = new Array<number>(bins).fill(0);
    for (const p of predData.predictions) {
      const r = Math.min(0.999, Math.max(0, p.survival_risk ?? 0));
      const idx = Math.min(bins - 1, Math.floor(r * bins));
      counts[idx] += 1;
    }
    return {
      bins: Array.from({ length: bins }, (_, i) => (i / bins).toFixed(1)),
      counts,
    };
  }, [predData]);

  const barOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#00ccff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(0, 204, 255, 0.2)',
          borderWidth: 1,
          titleFont: { size: 10, family: 'monospace' },
          bodyFont: { size: 10 },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 8, family: 'monospace' }, maxRotation: 0 },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 1,
          grid: { color: 'rgba(0, 204, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 8, family: 'monospace' } },
        },
      },
    }),
    [],
  );

  const doughnutOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', padding: 8, font: { size: 9 } },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
        },
      },
    }),
    [],
  );

  const histOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#00ccff',
          bodyColor: '#e2e8f0',
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 8, family: 'monospace' } },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 204, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 8, family: 'monospace' } },
        },
      },
    }),
    [],
  );

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span>加载 TCGA 队列…</span>
      </div>
    );
  }

  if (error || !predData || !stats) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <p className="text-xs text-red-300">{error ?? '无 TCGA 数据'}</p>
      </div>
    );
  }

  const { cancer_type: cancerType, cv_scores } = predData.metadata;

  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      {/* 头部 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
            TCGA 患者队列
          </h3>
        </div>
        <Badge
          variant="outline"
          className="border-cyan-400/40 bg-cyan-400/10 text-[10px] text-cyan-300"
        >
          {cancerType.toUpperCase()}
        </Badge>
      </div>

      {/* 队列统计 */}
      <div className="grid grid-cols-3 gap-2">
        <QuickStat icon={<Users className="h-3.5 w-3.5" />} label="样本数" value={String(stats.nSamples)} color="#00ccff" />
        <QuickStat icon={<Target className="h-3.5 w-3.5" />} label="AUC" value={cv_scores.auc.toFixed(2)} color="#00ff88" />
        <QuickStat icon={<Activity className="h-3.5 w-3.5" />} label="Accuracy" value={(cv_scores.accuracy * 100).toFixed(0) + '%'} color="#ffcc00" />
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* 免疫浸润组成（堆叠柱状图） */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          免疫浸润组成（Top {MAX_SAMPLES} 患者）
        </div>
        <div className="h-36">
          <Bar
            data={{
              labels: stackLabels,
              datasets: stackDatasets,
            }}
            options={barOptions}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stackDatasets.map((d) => (
            <span
              key={d.label}
              className="truncate rounded px-1 py-0.5 text-[8px] font-mono text-slate-400"
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* 免疫亚型分布 */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          免疫亚型分布
        </div>
        <div className="h-44">
          {subtypeChart && (
            <Doughnut
              data={{
                labels: subtypeChart.labels,
                datasets: [
                  {
                    data: subtypeChart.counts,
                    backgroundColor: subtypeChart.colors,
                    borderColor: '#071019',
                    borderWidth: 2,
                  },
                ],
              }}
              options={doughnutOptions}
            />
          )}
        </div>
      </div>

      {/* 生存风险分布 */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          生存风险分布
        </div>
        <div className="h-28">
          <Bar
            data={{
              labels: riskHistogram.bins,
              datasets: [
                {
                  data: riskHistogram.counts,
                  backgroundColor: 'rgba(204, 102, 255, 0.6)',
                  borderColor: '#cc66ff',
                  borderWidth: 1,
                  borderRadius: 2,
                },
              ],
            }}
            options={histOptions}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>0.0</span>
          <span>风险分数</span>
          <span>1.0</span>
        </div>
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* GAT 注意力热图 + 通路 */}
      <AttentionHeatmap />

      {/* 说明 */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 p-2 text-[9px] leading-relaxed text-slate-500">
        TCGA-BRCA 参考队列（200 例合成患者）。免疫浸润、亚型与生存风险由 GAT
        图神经网络预测；通路注意力反映模型对 CAR-M 相关信号通路的关注度。
      </div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-md border border-slate-700/50 bg-slate-800/50 p-2">
      <div className="mb-1 flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] uppercase text-slate-500">{label}</span>
      </div>
      <div className="font-mono text-base font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}