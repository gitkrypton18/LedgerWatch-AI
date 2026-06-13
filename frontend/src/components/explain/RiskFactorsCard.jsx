import React from 'react';
import { ShieldAlert, Flame, Target, Zap } from 'lucide-react';

export default function RiskFactorsCard({ transaction }) {
  if (!transaction) return null;

  const factors = [];

  // Risk score breakdown
  if (transaction.risk_score >= 90) {
    factors.push({ icon: Flame, label: 'Critical Risk', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Score in top 10% of all anomalies' });
  } else if (transaction.risk_score >= 70) {
    factors.push({ icon: ShieldAlert, label: 'High Risk', color: 'text-orange-400', bg: 'bg-orange-500/10', desc: 'Score in top 30% of anomalies' });
  } else if (transaction.risk_score >= 30) {
    factors.push({ icon: Target, label: 'Medium Risk', color: 'text-amber-400', bg: 'bg-amber-500/10', desc: 'Some suspicious patterns detected' });
  } else {
    factors.push({ icon: Zap, label: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10', desc: 'Within normal parameters' });
  }

  // Additional context
  if (transaction.isFraud === 1) {
    factors.push({ icon: Flame, label: 'Confirmed Fraud', color: 'text-red-400', bg: 'bg-red-500/10', desc: 'Ground truth label confirms fraud' });
  }

  if (transaction.amount > 500000) {
    factors.push({ icon: Target, label: 'Mega Transfer', color: 'text-purple-400', bg: 'bg-purple-500/10', desc: 'Amount exceeds $500K threshold' });
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={18} className="text-red-400" />
        <h3 className="text-sm font-semibold text-slate-200">Risk Factors</h3>
      </div>

      <div className="space-y-2.5">
        {factors.map((factor, idx) => (
          <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-lg ${factor.bg} border border-slate-700/20`}>
            <factor.icon size={14} className={`shrink-0 ${factor.color}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${factor.color}`}>{factor.label}</div>
              <div className="text-xs text-slate-500 truncate">{factor.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
