import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X, ChevronDown } from 'lucide-react';

const typeOptions = ['TRANSFER', 'CASH_OUT', 'PAYMENT', 'CASH_IN', 'DEBIT'];
const bandOptions = ['Low', 'Medium', 'High', 'Critical'];
const statusOptions = ['Anomaly', 'Normal'];

export default function FilterBar({ filters, onFilterChange, sortConfig, onSortChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const activeFilterCount = [
    filters.types.length,
    filters.bands.length,
    filters.status.length,
    filters.minAmount || filters.maxAmount ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex items-center gap-3">
        <div className={`relative flex-1 transition-all duration-300 ${searchFocused ? 'ring-1 ring-cyan-500/50' : ''} rounded-xl`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by ID, name, or amount..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
          {filters.search && (
            <button onClick={() => onFilterChange({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          )}
        </div>

        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] rounded-md font-bold">{activeFilterCount}</span>
          )}
        </button>

        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-slate-900/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-medium transition-all">
            <ArrowUpDown size={16} />
            {sortConfig.key ? `${sortConfig.key} ${sortConfig.direction === 'asc' ? '↑' : '↓'}` : 'Sort'}
            <ChevronDown size={14} />
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
            {[
              { key: 'risk_score', label: 'Risk Score' },
              { key: 'amount', label: 'Amount' },
              { key: 'step', label: 'Time (Step)' },
              { key: 'anomaly_score', label: 'Anomaly Score' }
            ].map(opt => (
              <div key={opt.key} className="px-3 py-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{opt.label}</div>
                <div className="flex gap-1">
                  <button onClick={() => onSortChange({ key: opt.key, direction: 'desc' })} className={`flex-1 py-1 text-xs rounded-md border ${sortConfig.key === opt.key && sortConfig.direction === 'desc' ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>High → Low</button>
                  <button onClick={() => onSortChange({ key: opt.key, direction: 'asc' })} className={`flex-1 py-1 text-xs rounded-md border ${sortConfig.key === opt.key && sortConfig.direction === 'asc' ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>Low → High</button>
                </div>
              </div>
            ))}
            {sortConfig.key && (
              <button onClick={() => onSortChange({ key: null, direction: null })} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/5 transition-colors">
                Clear Sort
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-900/40 border border-slate-700/30 rounded-xl" style={{animation: 'fadeIn 0.2s ease-out'}}>
          {/* Type Filter */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 block">Transaction Type</label>
            <div className="flex flex-wrap gap-1.5">
              {typeOptions.map(type => (
                <button
                  key={type}
                  onClick={() => {
                    const newTypes = filters.types.includes(type)
                      ? filters.types.filter(t => t !== type)
                      : [...filters.types, type];
                    onFilterChange({ ...filters, types: newTypes });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${filters.types.includes(type) ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Band Filter */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 block">Risk Band</label>
            <div className="flex flex-wrap gap-1.5">
              {bandOptions.map(band => (
                <button
                  key={band}
                  onClick={() => {
                    const newBands = filters.bands.includes(band)
                      ? filters.bands.filter(b => b !== band)
                      : [...filters.bands, band];
                    onFilterChange({ ...filters, bands: newBands });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${filters.bands.includes(band) ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 block">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => {
                    const newStatus = filters.status.includes(status)
                      ? filters.status.filter(s => s !== status)
                      : [...filters.status, status];
                    onFilterChange({ ...filters, status: newStatus });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${filters.status.includes(status) ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 block">Amount Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAmount}
                onChange={(e) => onFilterChange({ ...filters, minAmount: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-slate-600">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAmount}
                onChange={(e) => onFilterChange({ ...filters, maxAmount: e.target.value })}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.types.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
              {t} <button onClick={() => onFilterChange({...filters, types: filters.types.filter(x => x !== t)})}><X size={10} /></button>
            </span>
          ))}
          {filters.bands.map(b => (
            <span key={b} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
              {b} <button onClick={() => onFilterChange({...filters, bands: filters.bands.filter(x => x !== b)})}><X size={10} /></button>
            </span>
          ))}
          {filters.status.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
              {s} <button onClick={() => onFilterChange({...filters, status: filters.status.filter(x => x !== s)})}><X size={10} /></button>
            </span>
          ))}
          {(filters.minAmount || filters.maxAmount) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400">
              ${filters.minAmount || 0} - ${filters.maxAmount || '∞'} <button onClick={() => onFilterChange({...filters, minAmount: '', maxAmount: ''})}><X size={10} /></button>
            </span>
          )}
          <button onClick={() => onFilterChange({ search: '', types: [], bands: [], status: [], minAmount: '', maxAmount: '' })} className="text-xs text-slate-500 hover:text-red-400 transition-colors ml-1">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
