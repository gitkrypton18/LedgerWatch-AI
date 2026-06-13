import React from 'react';
import { ArrowUp, ArrowDown, Info } from 'lucide-react';

export default function FeatureImportanceList({ shapValues }) {
  const entries = Object.entries(shapValues || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8);

  const maxVal = Math.max(...entries.map(e => Math.abs(e[1])));

  return (
    <div className="space-y-3">
      {entries.map(([feature, value], idx) => {
        const pct = (Math.abs(value) / maxVal) * 100;
        const isPositive = value > 0;
        const rank = idx + 1;

        return (
          <div key={feature} className="group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${rank <= 3 ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                  {rank}
                </span>
                <span className="text-sm text-slate-300 font-medium">{feature.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isPositive ? <ArrowUp size={12} className="text-red-400" /> : <ArrowDown size={12} className="text-emerald-400" />}
                <span className={`font-mono text-sm font-semibold ${isPositive ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isPositive ? '+' : ''}{value.toFixed(4)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden ml-7">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${isPositive ? 'bg-red-500/60' : 'bg-emerald-500/60'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/30 text-xs text-slate-500">
        <Info size={12} />
        <span>Positive values increase anomaly risk. Negative values decrease it.</span>
      </div>
    </div>
  );
}
