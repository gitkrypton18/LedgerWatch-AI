import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { feature: 'is_round_amount', fraud: 1.69, normal: 0.12 },
  { feature: 'type_TRANSFER', fraud: 1.14, normal: 0.08 },
  { feature: 'hour_of_step', fraud: 0.85, normal: 0.15 },
  { feature: 'hour_of_step_cos', fraud: 0.79, normal: 0.11 },
  { feature: 'is_new_dest', fraud: 0.22, normal: 0.05 },
  { feature: 'amount_log', fraud: 0.18, normal: 0.09 },
  { feature: 'balance_diff_orig', fraud: 0.15, normal: 0.07 },
  { feature: 'is_balance_zeroed', fraud: 0.12, normal: 0.02 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{label.replace(/_/g, ' ')}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-mono">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: p.color }}>{p.name}: {p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FeatureDistributionChart() {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
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
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            width={95}
            tickFormatter={(v) => v.replace(/_/g, ' ').substring(0, 16)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="fraud" name="Fraud (Mean |SHAP|)" fill="rgba(239, 68, 68, 0.7)" stroke="rgba(239, 68, 68, 0.9)" strokeWidth={1} radius={[0, 4, 4, 0]} barSize={14} />
          <Bar dataKey="normal" name="Normal (Mean |SHAP|)" fill="rgba(16, 185, 129, 0.7)" stroke="rgba(16, 185, 129, 0.9)" strokeWidth={1} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
