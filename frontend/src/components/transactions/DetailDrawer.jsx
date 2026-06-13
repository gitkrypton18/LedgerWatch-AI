import React, { useEffect } from 'react';
import { X, AlertTriangle, Shield, User, ArrowRight, Clock, DollarSign, Activity } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ShapMiniChart from './ShapMiniChart';

export default function DetailDrawer({ transaction, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!transaction) return null;

  const riskColor = transaction.risk_score >= 90 ? 'text-red-400' : transaction.risk_score >= 70 ? 'text-orange-400' : transaction.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400';
  const riskGlow = transaction.risk_score >= 90 ? 'shadow-red-500/20' : transaction.risk_score >= 70 ? 'shadow-orange-500/20' : transaction.risk_score >= 30 ? 'shadow-amber-500/20' : 'shadow-emerald-500/20';
  const ringColor = transaction.risk_score >= 90 ? '#ef4444' : transaction.risk_score >= 70 ? '#f97316' : transaction.risk_score >= 30 ? '#f59e0b' : '#10b981';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`relative w-full max-w-lg h-full bg-[#0f172a] border-l border-slate-700/50 shadow-2xl ${riskGlow} overflow-y-auto`} style={{animation: 'slideInRight 0.3s ease-out'}}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transaction.is_anomaly ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {transaction.is_anomaly ? <AlertTriangle size={20} /> : <Shield size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Transaction #{transaction.id}</h3>
              <p className="text-xs text-slate-500">{transaction.nameOrig} → {transaction.nameDest}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Risk Score Hero */}
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <svg className="w-32 h-32 -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#1e293b" strokeWidth="8" fill="none" />
                <circle 
                  cx="64" cy="64" r="56" 
                  stroke={ringColor}
                  strokeWidth="8" 
                  fill="none"
                  strokeDasharray={`${(transaction.risk_score / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold font-mono ${riskColor}`}>{transaction.risk_score}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Score</span>
              </div>
            </div>
            <div className="ml-6 space-y-1">
              <StatusBadge band={transaction.risk_band} />
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Activity size={14} />
                <span>Anomaly Score: <span className="font-mono text-slate-200">{transaction.anomaly_score?.toFixed(4)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock size={14} />
                <span>Step: <span className="font-mono text-slate-200">{transaction.step}</span></span>
              </div>
            </div>
          </div>

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider mb-2">
                <DollarSign size={12} /> Amount
              </div>
              <div className="text-xl font-mono font-semibold text-slate-100">
                ${transaction.amount?.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">{transaction.type}</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider mb-2">
                <Clock size={12} /> Hour
              </div>
              <div className="text-xl font-mono font-semibold text-slate-100">
                {transaction.hour_of_step || Math.floor(transaction.step % 24)}:00
              </div>
              <div className="text-xs text-slate-500 mt-1">Step {transaction.step}</div>
            </div>
          </div>

          {/* Balance Flow */}
          <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ArrowRight size={14} className="text-cyan-400" /> Balance Flow
            </h4>

            {/* Originator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1"><User size={10} /> {transaction.nameOrig}</span>
                <span className="text-slate-500">Originator</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800/50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Before</div>
                  <div className="text-sm font-mono text-slate-300">${transaction.oldbalanceOrg?.toLocaleString()}</div>
                </div>
                <ArrowRight size={16} className="text-slate-600" />
                <div className="flex-1 bg-slate-800/50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">After</div>
                  <div className={`text-sm font-mono ${transaction.newbalanceOrig === 0 && transaction.amount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    ${transaction.newbalanceOrig?.toLocaleString()}
                  </div>
                </div>
              </div>
              {transaction.newbalanceOrig === 0 && transaction.amount > 0 && (
                <div className="text-[10px] text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-md px-2 py-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> Balance zeroed after transaction — fraud indicator
                </div>
              )}
            </div>

            <div className="h-px bg-slate-700/30" />

            {/* Destination */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1"><User size={10} /> {transaction.nameDest}</span>
                <span className="text-slate-500">Destination</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-800/50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">Before</div>
                  <div className="text-sm font-mono text-slate-300">${transaction.oldbalanceDest?.toLocaleString()}</div>
                </div>
                <ArrowRight size={16} className="text-slate-600" />
                <div className="flex-1 bg-slate-800/50 rounded-lg p-2 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">After</div>
                  <div className="text-sm font-mono text-slate-300">${transaction.newbalanceDest?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SHAP Explanation */}
          <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-300 mb-1">SHAP Explanation</h4>
            <p className="text-xs text-slate-500 mb-4">Why this transaction was flagged</p>
            <ShapMiniChart shapValues={transaction.shap_values} />
            <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/60" /> Increases risk</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> Decreases risk</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
              Flag for Review
            </button>
            <button className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors">
              Export Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
