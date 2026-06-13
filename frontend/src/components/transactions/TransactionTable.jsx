import React from 'react';
import { ArrowUpDown, Eye, ArrowRightLeft, ArrowUp, ArrowDown, Wallet, CreditCard, Banknote, Receipt } from 'lucide-react';
import StatusBadge from './StatusBadge';

const typeIcons = {
  TRANSFER: ArrowRightLeft,
  CASH_OUT: ArrowUp,
  CASH_IN: ArrowDown,
  PAYMENT: CreditCard,
  DEBIT: Banknote,
};

export default function TransactionTable({ transactions, sortConfig, onSort, onViewDetail }) {
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={12} className="text-slate-600 opacity-0 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-cyan-400" /> 
      : <ArrowDown size={12} className="text-cyan-400" />;
  };

  const SortHeader = ({ column, children, className = '' }) => (
    <th 
      onClick={() => onSort(column)}
      className={`group cursor-pointer select-none ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 font-medium">
            <SortHeader column="id" className="px-6 py-3.5">ID</SortHeader>
            <th className="px-4 py-3.5">Type</th>
            <SortHeader column="amount" className="px-4 py-3.5">Amount</SortHeader>
            <th className="px-4 py-3.5">Origin → Dest</th>
            <SortHeader column="risk_score" className="px-4 py-3.5">Risk</SortHeader>
            <th className="px-4 py-3.5">Band</th>
            <th className="px-4 py-3.5">Status</th>
            <SortHeader column="step" className="px-4 py-3.5">Time</SortHeader>
            <th className="px-6 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {transactions.map((tx, idx) => {
            const TypeIcon = typeIcons[tx.type] || Receipt;
            const isEven = idx % 2 === 0;

            return (
              <tr 
                key={tx.id} 
                className={`group transition-all duration-200 ${isEven ? 'bg-slate-900/20' : 'bg-transparent'} hover:bg-slate-800/40 cursor-pointer`}
                onClick={() => onViewDetail(tx)}
              >
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-slate-300">#{tx.id}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'TRANSFER' ? 'bg-purple-500/10 text-purple-400' : tx.type === 'CASH_OUT' ? 'bg-amber-500/10 text-amber-400' : tx.type === 'CASH_IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      <TypeIcon size={14} />
                    </div>
                    <span className="text-sm text-slate-300">{tx.type}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-sm text-slate-200">${tx.amount?.toLocaleString()}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 truncate max-w-[80px]" title={tx.nameOrig}>{tx.nameOrig}</span>
                    <ArrowRightLeft size={10} className="text-slate-600 shrink-0" />
                    <span className="text-slate-400 truncate max-w-[80px]" title={tx.nameDest}>{tx.nameDest}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${tx.risk_score >= 90 ? 'bg-red-500' : tx.risk_score >= 70 ? 'bg-orange-500' : tx.risk_score >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${tx.risk_score}%` }}
                      />
                    </div>
                    <span className={`font-mono text-sm font-medium ${tx.risk_score >= 90 ? 'text-red-400' : tx.risk_score >= 70 ? 'text-orange-400' : tx.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {tx.risk_score}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge band={tx.risk_band} size="sm" />
                </td>
                <td className="px-4 py-4">
                  {tx.is_anomaly ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium uppercase tracking-wide">
                      <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Anomaly
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium uppercase tracking-wide">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" /> Normal
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs text-slate-500 font-mono">Step {tx.step}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onViewDetail(tx); }}
                    className="p-2 rounded-lg hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {transactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Wallet size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-xs mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
