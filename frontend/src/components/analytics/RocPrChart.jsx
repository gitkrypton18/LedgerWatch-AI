import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const rocData = [
  { fpr: 0.00, tpr: 0.00, pr_recall: 1.00 },
  { fpr: 0.01, tpr: 0.35, pr_recall: 0.85 },
  { fpr: 0.02, tpr: 0.52, pr_recall: 0.72 },
  { fpr: 0.03, tpr: 0.64, pr_recall: 0.61 },
  { fpr: 0.05, tpr: 0.76, pr_recall: 0.52 },
  { fpr: 0.08, tpr: 0.84, pr_recall: 0.44 },
  { fpr: 0.12, tpr: 0.89, pr_recall: 0.38 },
  { fpr: 0.18, tpr: 0.93, pr_recall: 0.33 },
  { fpr: 0.25, tpr: 0.96, pr_recall: 0.29 },
  { fpr: 0.35, tpr: 0.98, pr_recall: 0.26 },
  { fpr: 0.50, tpr: 0.99, pr_recall: 0.23 },
  { fpr: 0.70, tpr: 1.00, pr_recall: 0.21 },
  { fpr: 1.00, tpr: 1.00, pr_recall: 0.19 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-xs text-slate-500 mb-1">FPR: {label?.toFixed(2)}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-sm font-mono" style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(3)}
        </div>
      ))}
    </div>
  );
};

export default function RocPrChart() {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rocData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="fpr" 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={{ stroke: '#334155' }}
            domain={[0, 1]}
            label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            iconType="circle"
          />
          <Line 
            type="monotone" 
            dataKey="tpr" 
            name="ROC Curve (AUC = 0.8946)" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="fpr" 
            name="Random Baseline (AUC = 0.5000)" 
            stroke="#475569" 
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
