import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Activity, TrendingDown, Shield, Zap, Grid3x3 } from 'lucide-react';
import { useSim } from '@/context/SimContext';
import type { SimStatistics } from '@/types/simulation';

interface SimStatsExtras {
  ecmAverage?: number[];
  killEvents?: number[];
}

type DashboardStats = SimStatistics & SimStatsExtras;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, annotationPlugin);

const commonChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#00ccff',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(0, 204, 255, 0.2)',
      borderWidth: 1,
      padding: 8,
      titleFont: { size: 11, family: 'monospace' },
      bodyFont: { size: 11 },
    },
  },
  scales: {
    x: {
      display: true,
      grid: { color: 'rgba(0, 204, 255, 0.05)' },
      ticks: { color: '#64748b', font: { size: 9, family: 'monospace' }, maxTicksLimit: 6 },
    },
    y: {
      display: true,
      grid: { color: 'rgba(0, 204, 255, 0.05)' },
      ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } },
    },
  },
};

export default function Dashboard() {
  const { state } = useSim();
  const stats = state.statistics as DashboardStats;

  const hasData = stats.time.length > 0;

  const currentTumorCount = hasData ? stats.tumorCount[stats.tumorCount.length - 1] : state.simParams.tumorCount;
  const initialTumorCount = state.simParams.tumorCount;
  const tumorReduction = initialTumorCount > 0
    ? ((initialTumorCount - currentTumorCount) / initialTumorCount * 100).toFixed(1)
    : '0';

  const totalPhago = hasData ? stats.phagocytosisRate[stats.phagocytosisRate.length - 1] : 0;
  const m1Ratio = hasData ? (stats.m1Ratio[stats.m1Ratio.length - 1] * 100).toFixed(1) : '0';
  const cd8Infil = hasData ? (stats.cd8Infiltration[stats.cd8Infiltration.length - 1] * 100).toFixed(1) : '0';
  const ecmValue = hasData && Array.isArray(stats.ecmAverage)
    ? (stats.ecmAverage[stats.ecmAverage.length - 1] * 100).toFixed(0)
    : null;

  const tumorChartData = useMemo(() => ({
    labels: stats.time.map(t => t.toFixed(1)),
    datasets: [
      {
        label: 'Tumor Cells',
        data: stats.tumorCount,
        borderColor: '#cc66ff',
        backgroundColor: 'rgba(204, 102, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: 'CAR-M',
        data: stats.carMCount,
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.05)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      },
    ],
  }), [stats]);

  const polarizationChartData = useMemo(() => ({
    labels: stats.time.map(t => t.toFixed(1)),
    datasets: [
      {
        label: 'M1 %',
        data: stats.m1Ratio.map(v => v * 100),
        borderColor: '#ff3366',
        backgroundColor: 'rgba(255, 51, 102, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'M2 %',
        data: stats.m2Ratio.map(v => v * 100),
        borderColor: '#00ccff',
        backgroundColor: 'rgba(0, 204, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  }), [stats]);

  const cd8ChartData = useMemo(() => ({
    labels: stats.time.map(t => t.toFixed(1)),
    datasets: [{
      label: 'CD8+ Activation',
      data: stats.cd8Infiltration.map(v => v * 100),
      borderColor: '#ffcc00',
      backgroundColor: 'rgba(255, 204, 0, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  }), [stats]);

  const phagoChartData = useMemo(() => ({
    labels: stats.time.map(t => t.toFixed(1)),
    datasets: [{
      label: 'Phagocytosis Events',
      data: stats.phagocytosisRate,
      borderColor: '#ff3366',
      backgroundColor: 'rgba(255, 51, 102, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    }],
  }), [stats]);

  const tumorOptions = useMemo<ChartOptions<'line'>>(() => ({
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      annotation: {
        annotations: {
          ct0508Line: {
            type: 'line',
            yMin: initialTumorCount * 0.8,
            yMax: initialTumorCount * 0.8,
            borderColor: 'rgba(255, 204, 0, 0.5)',
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              display: true,
              // Illustrative target line only — NOT a CT-0508 trial result.
              // The Phase 1 report (Reiss et al., Nat Med 2025,
              // doi:10.1038/s41591-025-03495-z) showed no RECIST objective
              // responses; 44% (4/9) HER2 3+ patients had stable disease.
              content: 'Illustrative target (−20%)',
              position: 'end',
              backgroundColor: 'rgba(255, 204, 0, 0.1)',
              color: '#ffcc00',
              font: { size: 9, family: 'monospace' },
            },
          },
        },
      },
    },
  }), [initialTumorCount]);

  const polarizationOptions = useMemo<ChartOptions<'line'>>(() => ({
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      annotation: {
        annotations: {
          m1TippingPoint: {
            type: 'line',
            yMin: 50,
            yMax: 50,
            borderColor: 'rgba(0, 255, 136, 0.3)',
            borderDash: [3, 3],
            borderWidth: 1,
            label: {
              display: true,
              content: 'M1 Tipping Point',
              position: 'start',
              color: '#00ff88',
              font: { size: 9 },
            },
          },
        },
      },
    },
  }), []);

  const cd8Options = useMemo<ChartOptions<'line'>>(() => ({
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      annotation: {
        annotations: {
          ct0508Range: {
            type: 'box',
            yMin: 0.3,
            yMax: 0.7,
            backgroundColor: 'rgba(255, 204, 0, 0.05)',
            borderColor: 'rgba(255, 204, 0, 0.2)',
            borderWidth: 1,
            label: {
              display: true,
              content: 'Exploratory CD8+ Band',
              position: 'start',
            },
          },
        },
      },
    },
  }), []);

  const phagoOptions = useMemo<ChartOptions<'line'>>(() => commonChartOptions, []);

  const emptyChart = (
    <div className="h-full flex items-center justify-center text-xs text-slate-600">
      Run simulation to see data
    </div>
  );

  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Metrics</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          label="Tumor Reduction"
          value={`${tumorReduction}%`}
          color="#00ff88"
          positive={parseFloat(tumorReduction) > 0}
        />
        <MetricCard
          icon={<Zap className="w-3.5 h-3.5" />}
          label="Phagocytosis"
          value={totalPhago.toString()}
          color="#ffcc00"
        />
        <MetricCard
          icon={<Shield className="w-3.5 h-3.5" />}
          label="M1 Ratio"
          value={`${m1Ratio}%`}
          color="#ff3366"
        />
        <MetricCard
          icon={<Activity className="w-3.5 h-3.5" />}
          label="CD8+ Activation"
          value={`${cd8Infil}%`}
          color="#ffcc00"
        />
        {ecmValue !== null && (
          <MetricCard
            icon={<Grid3x3 className="w-3.5 h-3.5" />}
            label="ECM Density"
            value={`${ecmValue}%`}
            color="#a855f7"
          />
        )}
      </div>

      <div className="h-px bg-cyan-400/20" />

      <div className="space-y-3">
        <ChartPanel title="Tumor & CAR-M Dynamics" height="h-28">
          {hasData ? <Line data={tumorChartData} options={tumorOptions} /> : emptyChart}
        </ChartPanel>

        <ChartPanel title="Phagocytosis Rate" height="h-24">
          {hasData ? <Line data={phagoChartData} options={phagoOptions} /> : emptyChart}
        </ChartPanel>

        <ChartPanel title="Macrophage Polarization" height="h-24">
          {hasData ? <Line data={polarizationChartData} options={polarizationOptions} /> : emptyChart}
        </ChartPanel>

        <ChartPanel title="CD8+ T Cell Activation" height="h-24">
          {hasData ? <Line data={cd8ChartData} options={cd8Options} /> : emptyChart}
        </ChartPanel>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  positive?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-md bg-slate-800/50 border border-slate-700/50">
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] text-slate-500 uppercase">{label}</span>
      </div>
      <div
        className="text-lg font-bold font-mono"
        style={{ color: positive !== undefined ? (positive ? '#00ff88' : '#ff3366') : color }}
      >
        {value}
      </div>
    </div>
  );
}

function ChartPanel({
  title,
  height,
  children,
}: {
  title: string;
  height: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-slate-500 uppercase font-medium">{title}</div>
      <div className={height}>{children}</div>
    </div>
  );
}
