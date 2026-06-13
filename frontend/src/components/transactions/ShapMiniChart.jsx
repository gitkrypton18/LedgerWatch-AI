import React from 'react';

export default function ShapMiniChart({ shapValues }) {
  const entries = Object.entries(shapValues || {})
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6);

  const maxVal = Math.max(...entries.map(e => Math.abs(e[1])));

  return (
    <div className="space-y-2">
      {entries.map(([feature, value]) => {
        const pct = (Math.abs(value) / maxVal) * 100;
        const isPositive = value > 0;
        return (
          <div key={feature} className="flex items-center gap-3">
            <span className="w-32 text-xs text-slate-400 truncate text-right" title={feature}>{feature}</span>
            <div className="flex-1 h-5 bg-slate-800/50 rounded-md overflow-hidden relative">
              <div 
                className={`h-full rounded-md transition-all duration-500 ${isPositive ? 'bg-red-500/60 ml-auto' : 'bg-emerald-500/60'}`}
                style={{ width: `${pct}%` }}
              />
              <span className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium ${isPositive ? 'left-2 text-red-300' : 'right-2 text-emerald-300'}`}>
                {value > 0 ? '+' : ''}{value.toFixed(3)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
