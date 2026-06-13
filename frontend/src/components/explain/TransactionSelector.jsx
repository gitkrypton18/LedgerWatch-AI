import React, { useState } from 'react';
import { Search, ChevronDown, AlertTriangle, Shield } from 'lucide-react';

const MOCK_TRANSACTIONS = [
  { id: 1, type: 'TRANSFER', amount: 181, risk_score: 99, risk_band: 'Critical', is_anomaly: true, nameOrig: 'C1231006815', nameDest: 'C1970109150' },
  { id: 6, type: 'TRANSFER', amount: 420000, risk_score: 100, risk_band: 'Critical', is_anomaly: true, nameOrig: 'C99999', nameDest: 'C88888' },
  { id: 13, type: 'TRANSFER', amount: 1000000, risk_score: 100, risk_band: 'Critical', is_anomaly: true, nameOrig: 'C14141', nameDest: 'C15151' },
  { id: 3, type: 'CASH_OUT', amount: 229133.94, risk_score: 87, risk_band: 'High', is_anomaly: true, nameOrig: 'C905333901', nameDest: 'M573053279' },
  { id: 4, type: 'PAYMENT', amount: 11668.14, risk_score: 12, risk_band: 'Low', is_anomaly: false, nameOrig: 'C12345', nameDest: 'M123' },
  { id: 19, type: 'PAYMENT', amount: 99999, risk_score: 71, risk_band: 'High', is_anomaly: true, nameOrig: 'C25252', nameDest: 'M444' },
  { id: 32, type: 'TRANSFER', amount: 666666, risk_score: 100, risk_band: 'Critical', is_anomaly: true, nameOrig: 'C44444', nameDest: 'C45454' },
  { id: 44, type: 'TRANSFER', amount: 999999, risk_score: 100, risk_band: 'Critical', is_anomaly: true, nameOrig: 'C62626', nameDest: 'C63636' },
];

export default function TransactionSelector({ selectedId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = MOCK_TRANSACTIONS.filter(tx => 
    tx.id.toString().includes(search) ||
    tx.nameOrig.toLowerCase().includes(search.toLowerCase())
  );

  const selected = MOCK_TRANSACTIONS.find(tx => tx.id === selectedId);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-left hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selected ? (
            <>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected.is_anomaly ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {selected.is_anomaly ? <AlertTriangle size={14} /> : <Shield size={14} />}
              </div>
              <div>
                <div className="text-sm text-slate-200 font-medium">Transaction #{selected.id}</div>
                <div className="text-xs text-slate-500">{selected.type} · ${selected.amount.toLocaleString()} · Risk {selected.risk_score}</div>
              </div>
            </>
          ) : (
            <span className="text-sm text-slate-500">Select a transaction to explain...</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden" style={{animation: 'fadeIn 0.15s ease-out'}}>
          <div className="p-3 border-b border-slate-700/50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by ID or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(tx => (
              <button
                key={tx.id}
                onClick={() => { onSelect(tx.id); setIsOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors ${selectedId === tx.id ? 'bg-cyan-500/5' : ''}`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${tx.is_anomaly ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {tx.is_anomaly ? <AlertTriangle size={12} /> : <Shield size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300 font-medium">#{tx.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${tx.risk_band === 'Critical' ? 'bg-red-500/10 text-red-400' : tx.risk_band === 'High' ? 'bg-orange-500/10 text-orange-400' : tx.risk_band === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {tx.risk_band}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{tx.type} · ${tx.amount.toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
