import { useEffect, useMemo, useState } from 'react';
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
} from 'chart.js';
import { FlaskConical, Trash2, Save, BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { useSim } from '@/context/SimContext';
import type { Experiment } from '@/types/simulation';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const STORAGE_KEY = 'car-macrophage-experiments';

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: {
      display: true,
      labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' }, boxWidth: 12 },
    },
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

export default function ExperimentComparator() {
  const { state } = useSim();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [experimentName, setExperimentName] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Load experiments from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setExperiments(JSON.parse(saved));
      }
    } catch {
      setExperiments([]);
    }
  }, []);

  // Persist experiments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
    } catch {
      // Ignore storage errors
    }
  }, [experiments]);

  const handleSaveExperiment = () => {
    const name = experimentName.trim() || `Experiment ${experiments.length + 1}`;
    const newExperiment: Experiment = {
      id: uuidv4(),
      name,
      carDesign: state.carDesign,
      simParams: state.simParams,
      statistics: state.statistics,
      timestamp: Date.now(),
    };
    setExperiments((prev) => [newExperiment, ...prev]);
    setExperimentName('');
  };

  const handleDelete = (id: string) => {
    setExperiments((prev) => prev.filter((exp) => exp.id !== id));
    setCompareIds((prev) => prev.filter((compareId) => compareId !== id));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((compareId) => compareId !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const selectedForCompare = experiments.filter((exp) => compareIds.includes(exp.id));

  const tumorComparisonData = useMemo(() => {
    if (selectedForCompare.length === 0) return null;
    const colors = ['#cc66ff', '#00ff88'];
    return {
      labels: selectedForCompare[0].statistics.time.map((t) => t.toFixed(1)),
      datasets: selectedForCompare.map((exp, idx) => ({
        label: exp.name,
        data: exp.statistics.tumorCount,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      })),
    };
  }, [selectedForCompare]);

  const m1ComparisonData = useMemo(() => {
    if (selectedForCompare.length === 0) return null;
    const colors = ['#ff3366', '#00ccff'];
    return {
      labels: selectedForCompare[0].statistics.time.map((t) => t.toFixed(1)),
      datasets: selectedForCompare.map((exp, idx) => ({
        label: exp.name,
        data: exp.statistics.m1Ratio.map((v) => v * 100),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      })),
    };
  }, [selectedForCompare]);

  const hasStats = state.statistics.time.length > 0;

  return (
    <div className="glass-panel p-4 space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Experiment Comparator</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-400">
          {experiments.length} saved
        </Badge>
      </div>

      {/* Save experiment */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={experimentName}
            onChange={(e) => setExperimentName(e.target.value)}
            placeholder="Experiment name..."
            className="h-8 text-xs bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600"
            disabled={!hasStats}
          />
          <Button
            onClick={handleSaveExperiment}
            disabled={!hasStats}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
        {!hasStats && (
          <div className="text-[10px] text-slate-500">Run a simulation to capture experiment data.</div>
        )}
      </div>

      <div className="h-px bg-cyan-400/20" />

      {/* Compare mode toggle */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" />
          Compare Mode
        </div>
        <Button
          onClick={() => {
            setIsCompareMode((prev) => !prev);
            if (isCompareMode) setCompareIds([]);
          }}
          variant="outline"
          size="sm"
          className={`text-xs ${
            isCompareMode
              ? 'bg-amber-500/10 border-amber-400/40 text-amber-400 hover:bg-amber-500/20'
              : 'border-slate-700/50 text-slate-400 hover:bg-slate-800/50'
          }`}
        >
          {isCompareMode ? (
            <>
              <X className="w-3 h-3 mr-1" /> Cancel
            </>
          ) : (
            'Compare'
          )}
        </Button>
      </div>

      {/* Comparison charts */}
      {isCompareMode && selectedForCompare.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-medium">Tumor Count Overlay</div>
            <div className="h-32">
              {tumorComparisonData ? (
                <Line data={tumorComparisonData} options={commonChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-600">
                  Select experiments to compare
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-medium">M1 Ratio Overlay</div>
            <div className="h-32">
              {m1ComparisonData ? (
                <Line data={m1ComparisonData} options={commonChartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-600">
                  Select experiments to compare
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCompareMode && selectedForCompare.length === 0 && (
        <div className="text-xs text-slate-500 text-center py-4">Select up to 2 experiments to compare</div>
      )}

      <div className="h-px bg-cyan-400/20" />

      {/* Saved experiments list */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-400 uppercase">Saved Experiments</div>
        {experiments.length === 0 ? (
          <div className="text-xs text-slate-600 py-3 text-center">No saved experiments yet.</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {experiments.map((exp) => {
              const finalTumor = exp.statistics.tumorCount.length
                ? exp.statistics.tumorCount[exp.statistics.tumorCount.length - 1]
                : exp.simParams.tumorCount;
              const m1Ratio = exp.statistics.m1Ratio.length
                ? (exp.statistics.m1Ratio[exp.statistics.m1Ratio.length - 1] * 100).toFixed(1)
                : '0';
              const totalPhago = exp.statistics.phagocytosisRate.reduce((a, b) => a + b, 0).toFixed(0);
              const isSelected = compareIds.includes(exp.id);

              return (
                <div
                  key={exp.id}
                  className={`p-3 rounded-md border transition-all duration-200 ${
                    isSelected
                      ? 'border-cyan-400/60 bg-cyan-400/10'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-200 truncate">{exp.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(exp.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCompareMode && (
                        <Button
                          onClick={() => toggleCompare(exp.id)}
                          size="sm"
                          variant="outline"
                          className={`h-7 px-2 text-[10px] ${
                            isSelected
                              ? 'border-cyan-400/60 text-cyan-400 bg-cyan-400/10'
                              : 'border-slate-700/50 text-slate-400 hover:bg-slate-800/50'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDelete(exp.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Tumor</div>
                      <div className="text-xs font-mono text-emerald-400">{finalTumor.toString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">M1</div>
                      <div className="text-xs font-mono text-emerald-400">{`${m1Ratio}%`}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 uppercase">Phago</div>
                      <div className="text-xs font-mono text-emerald-400">{totalPhago}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
