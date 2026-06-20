import React from 'react';
import { Brain, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ModelDecisionCard({ transaction }) {
  if (!transaction) return null;

  const reasons = [];

  if (transaction.newbalanceOrig === 0 && transaction.amount > 0) {
    reasons.push({
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      title: 'Balance Zeroed',
      desc: 'Originator balance dropped to exactly zero after transaction — strong fraud indicator'
    });
  }

  if (transaction.type === 'TRANSFER') {
    reasons.push({
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      title: 'TRANSFER Type',
      desc: 'Fraud only occurs in TRANSFER and CASH_OUT transactions (0.66% fraud rate)'
    });
  }

  if (transaction.amount > 100000) {
    reasons.push({
      icon: AlertTriangle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      title: 'High Amount',
      desc: `Amount $${transaction.amount.toLocaleString()} exceeds typical threshold — large round amounts are suspicious`
    });
  }

  if (transaction.is_new_dest) {
    reasons.push({
      icon: AlertTriangle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      title: 'New Destination',
      desc: 'Destination account has no prior transaction history — unusual for large transfers'
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      title: 'Low Risk Pattern',
      desc: 'This transaction follows normal behavioral patterns with no major red flags detected'
    });
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={18} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200">Model Decision Logic</h3>
      </div>

      <div className="space-y-3">
        {reasons.map((reason, idx) => (
          <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${reason.bg} border ${reason.border}`}>
            <reason.icon size={16} className={`shrink-0 mt-0.5 ${reason.color}`} />
            <div>
              <div className={`text-sm font-medium ${reason.color}`}>{reason.title}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{reason.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Model Confidence</span>
          <span className="text-slate-300 font-mono">{transaction.is_anomaly ? 'High' : 'Low'}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-slate-500">Anomaly Score</span>
          <span className={`font-mono ${transaction.anomaly_score < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {transaction.anomaly_score?.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
