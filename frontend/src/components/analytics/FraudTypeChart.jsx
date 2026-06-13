import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'TRANSFER', value: 4097, color: '#ef4444' },
  { name: 'CASH_OUT', value: 4116, color: '#f97316' },
  { name: 'PAYMENT', value: 0, color: '#3b82f6' },
  { name: 'CASH_IN', value: 0, color: '#10b981' },
  { name: 'DEBIT', value: 0, color: '#8b5cf6' },
];

const typeStats = [
  { type: 'TRANSFER', total: 532909, fraud: 4097, rate: '0.77%' },
  { type: 'CASH_OUT', total: 2237500, fraud: 4116, rate: '0.18%' },
  { type: 'PAYMENT', total: 2151495, fraud: 0, rate: '0.00%' },
  { type: 'CASH_IN', total: 1399284, fraud: 0, rate: '0.00%' },
  { type: 'DEBIT', total: 41432, fraud: 0, rate: '0.00%' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <div className="text-sm font-medium text-slate-200">{d.name}</div>
      <div className="text-xs text-slate-500 mt-1">{d.value.toLocaleString()} fraud cases</div>
      <div className="text-xs text-slate-400">{((d.value / 8213) * 100).toFixed(1)}% of all fraud</div>
    </div>
  );
};

export default function FraudTypeChart() {
  return (
    <div className="space-y-4">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter(d => d.value > 0)}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.filter(d => d.value > 0).map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="middle" 
              align="right" 
              layout="vertical"
              wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Table */}
      <div className="space-y-2">
        {typeStats.map(stat => (
          <div key={stat.type} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/30">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stat.fraud > 0 ? 'bg-red-400' : 'bg-slate-600'}`} />
              <span className="text-xs text-slate-300 font-medium">{stat.type}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500">{stat.total.toLocaleString()} total</span>
              <span className={`font-mono font-medium ${stat.fraud > 0 ? 'text-red-400' : 'text-slate-500'}`}>{stat.rate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
