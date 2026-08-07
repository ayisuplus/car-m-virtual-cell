import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Loader2, AlertTriangle } from 'lucide-react';
import { loadTcgaAttention } from '@/lib/tcgaDataLoader';
import type { TcgaAttentionData } from '@/types/simulation';

/** 注意力值 → 背景色（蓝→红渐变，暗色主题下保持高对比）。 */
function attentionColor(v: number): string {
  const clamped = Math.max(0, Math.min(1, v));
  // 蓝(低) → 青 → 品红 → 红(高)
  const r = Math.round(40 + 215 * clamped);
  const g = Math.round(140 - 110 * clamped);
  const b = Math.round(255 - 200 * clamped);
  return `rgba(${r}, ${g}, ${b}, 0.85)`;
}

const MAX_PATHWAYS = 5;
const MAX_GENES = 10;

export default function AttentionHeatmap() {
  const [data, setData] = useState<TcgaAttentionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadTcgaAttention()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载注意力数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 从 top 通路收集基因（去重、限制数量），用于热图行/列。
  const { genes, matrix } = useMemo(() => {
    if (!data) return { genes: [], matrix: [] as number[][] };
    const picked: string[] = [];
    for (const p of data.top_pathways.slice(0, MAX_PATHWAYS)) {
      for (const g of p.genes) {
        if (!picked.includes(g) && data.gene_names.includes(g)) {
          picked.push(g);
        }
        if (picked.length >= MAX_GENES) break;
      }
      if (picked.length >= MAX_GENES) break;
    }
    // 从 layer0 矩阵提取子矩阵
    const idx = picked
      .map((g) => data.gene_names.indexOf(g))
      .filter((i) => i >= 0);
    const layer = data.attention[0]?.['layer0'] ?? [];
    const sub = idx.map((ri) => idx.map((ci) => layer?.[ri]?.[ci] ?? 0));
    return { genes: picked, matrix: sub };
  }, [data]);

  const topPathways = useMemo(
    () => (data ? [...data.top_pathways].sort((a, b) => b.avg_attention - a.avg_attention).slice(0, 8) : []),
    [data],
  );

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span>加载 GAT 注意力…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <p className="text-xs text-red-300">{error ?? '无注意力数据'}</p>
      </div>
    );
  }

  const maxV = genes.length > 0 ? Math.max(...matrix.flat(), 1) : 1;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
          GAT 注意力热图
        </h3>
      </div>

      {/* 基因×基因注意力热图 */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          基因级注意力矩阵（Top {genes.length} 基因）
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/40 p-1">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-right text-[8px] font-mono font-normal text-slate-500">
                  基因
                </th>
                {genes.map((g) => (
                  <th
                    key={g}
                    className="p-1 text-[8px] font-mono font-normal text-slate-400"
                  >
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, ri) => (
                <tr key={genes[ri]}>
                  <th className="p-1 text-right text-[8px] font-mono font-normal text-slate-400">
                    {genes[ri]}
                  </th>
                  {row.map((v, ci) => (
                    <td
                      key={ci}
                      title={`${genes[ri]} → ${genes[ci]}: ${v.toFixed(3)}`}
                      className="h-4 w-4 max-w-4 border border-slate-800/60"
                      style={{
                        backgroundColor: attentionColor(v / maxV),
                      }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: attentionColor(0) }} />
          <span>低</span>
          <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-red-500" />
          <span>高</span>
          <span className="ml-1 font-mono">max {maxV.toFixed(3)}</span>
        </div>
      </div>

      {/* 通路级注意力条形图 */}
      <div className="space-y-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          通路级注意力分数
        </div>
        <div className="space-y-1.5">
          {topPathways.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <div className="w-24 shrink-0 truncate text-[10px] text-slate-400" title={p.name}>
                {p.name}
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded bg-slate-800/70">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(4, p.avg_attention * 100)}%`,
                    backgroundColor: attentionColor(p.avg_attention),
                  }}
                />
              </div>
              <div className="w-10 shrink-0 text-right font-mono text-[10px] text-cyan-300">
                {p.avg_attention.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}