import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const data = [
  { score: 0, fraud: 0.02, normal: 0.08 },
  { score: 10, fraud: 0.01, normal: 0.12 },
  { score: 20, fraud: 0.015, normal: 0.15 },
  { score: 30, fraud: 0.02, normal: 0.18 },
  { score: 40, fraud: 0.03, normal: 0.14 },
  { score: 50, fraud: 0.05, normal: 0.10 },
  { score: 60, fraud: 0.08, normal: 0.08 },
  { score: 70, fraud: 0.12, normal: 0.06 },
  { score: 80, fraud: 0.18, normal: 0.04 },
  { score: 90, fraud: 0.28, normal: 0.02 },
  { score: 100, fraud: 0.21, normal: 0.01 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs text-slate-500 mb-1">Risk Score: {label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-mono">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: p.color }}>{p.name}: {(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function RiskDistributionChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="score" 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            label={{ value: 'Risk Score (0-100)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={87.4} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Fraud Mean (87.4)', fill: '#ef4444', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={49.6} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Normal Mean (49.6)', fill: '#10b981', fontSize: 10, position: 'bottom' }} />
          <Area type="monotone" dataKey="fraud" name="Fraud Distribution" stroke="#ef4444" strokeWidth={2} fill="url(#fraudGrad)" />
          <Area type="monotone" dataKey="normal" name="Normal Distribution" stroke="#10b981" strokeWidth={2} fill="url(#normalGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
