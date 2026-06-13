import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const data = [
  { percentile: 'Top 1%', precision: 0.109, lift: 109, random: 0.00129 },
  { percentile: 'Top 2%', precision: 0.078, lift: 78, random: 0.00129 },
  { percentile: 'Top 5%', precision: 0.042, lift: 32, random: 0.00129 },
  { percentile: 'Top 10%', precision: 0.025, lift: 19, random: 0.00129 },
  { percentile: 'Top 20%', precision: 0.015, lift: 12, random: 0.00129 },
  { percentile: 'Top 50%', precision: 0.006, lift: 5, random: 0.00129 },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs text-slate-500 mb-1">{d.percentile}</div>
      <div className="text-sm font-mono text-cyan-400">Precision: {(d.precision * 100).toFixed(1)}%</div>
      <div className="text-xs text-slate-400">Lift: {d.lift}× better than random</div>
    </div>
  );
};

export default function LiftChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="percentile" 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0.00129} stroke="#475569" strokeDasharray="6 4" label={{ value: 'Random (0.13%)', fill: '#64748b', fontSize: 10, position: 'right' }} />
          <Bar dataKey="precision" name="Precision" radius={[4, 4, 0, 0]} barSize={40}>
            {data.map((entry, index) => (
              <Cell key={index} fill={index === 0 ? 'rgba(239, 68, 68, 0.8)' : index === 1 ? 'rgba(249, 115, 22, 0.7)' : index === 2 ? 'rgba(245, 158, 11, 0.6)' : 'rgba(59, 130, 246, 0.5)'} stroke={index === 0 ? 'rgba(239, 68, 68, 0.9)' : index === 1 ? 'rgba(249, 115, 22, 0.8)' : index === 2 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(59, 130, 246, 0.6)'} strokeWidth={1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
