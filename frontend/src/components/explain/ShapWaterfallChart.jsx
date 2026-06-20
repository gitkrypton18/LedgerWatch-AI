import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const isPositive = data.value > 0;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{data.feature}</div>
      <div className={`text-sm font-mono font-semibold ${isPositive ? 'text-red-400' : 'text-emerald-400'}`}>
        {isPositive ? '+' : ''}{data.value.toFixed(4)}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {isPositive ? 'Increases anomaly risk' : 'Decreases anomaly risk'}
      </div>
    </div>
  );
};

export default function ShapWaterfallChart({ shapValues, baseValue }) {
  const data = useMemo(() => {
    const entries = Object.entries(shapValues || {})
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 10)
      .map(([feature, value]) => ({
        feature: feature.replace(/_/g, ' ').replace(/ [a-zA-Z]/g, l => l.toUpperCase()),
        value: value,
        absValue: Math.abs(value),
      }));

    // Add base value as first item
    return [
      { feature: 'Base Value', value: baseValue || 0, absValue: Math.abs(baseValue || 0), isBase: true },
      ...entries
    ];
  }, [shapValues, baseValue]);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis 
            type="number" 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
          />
          <YAxis 
            type="category" 
            dataKey="feature" 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
          <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell 
                key={index} 
                fill={entry.isBase ? '#3b82f6' : entry.value > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'}
                stroke={entry.isBase ? '#3b82f6' : entry.value > 0 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
