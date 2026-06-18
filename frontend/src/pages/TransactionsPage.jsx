import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStats, useTransactions } from '../hooks/useApi';

const TYPE_CONFIG = {
  TRANSFER: { color: 'bg-purple-500/20 text-purple-400', icon: '↔' },
  CASH_OUT: { color: 'bg-amber-500/20 text-amber-400', icon: '↓' },
  CASH_IN: { color: 'bg-emerald-500/20 text-emerald-400', icon: '↑' },
  PAYMENT: { color: 'bg-blue-500/20 text-blue-400', icon: '💳' },
  DEBIT: { color: 'bg-indigo-500/20 text-indigo-400', icon: '−' },
};

const StatusBadge = ({ band, isAnomaly }) => {
  const colors = {
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    High: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[band] || colors.Low}`}>
      {isAnomaly && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
      {band}
    </span>
  );
};

const RiskBar = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="w-16 lg:w-20 h-1.5 bg-background-tertiary rounded-full overflow-hidden flex-shrink-0">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(score || 0, 100)}%`, backgroundColor: score >= 95 ? '#EF4444' : score >= 85 ? '#F97316' : score >= 60 ? '#F59E0B' : score >= 30 ? '#3B82F6' : '#10B981' }} />
    </div>
    <span className="text-text-primary text-xs font-medium w-6 flex-shrink-0">{score || 0}</span>
  </div>
);

const ShapMiniChart = ({ shapValues }) => {
  if (!shapValues || Object.keys(shapValues).length === 0) {
    return <span className="text-text-muted text-xs">—</span>;
  }
  const entries = Object.entries(shapValues).slice(0, 4);
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)));
  return (
    <div className="space-y-0.5">
      {entries.map(([feature, value]) => (
        <div key={feature} className="flex items-center gap-1.5">
          <span className="text-text-muted text-[10px] w-16 lg:w-20 truncate">{feature}</span>
          <div className="flex-1 h-1 bg-background-tertiary rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(Math.abs(value) / maxVal) * 100}%`, backgroundColor: value > 0 ? '#EF4444' : '#10B981', marginLeft: value < 0 ? 'auto' : '0', marginRight: value > 0 ? 'auto' : '0' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
};

const DetailDrawer = ({ transaction, onClose }) => {
  if (!transaction) return null;
  const score = transaction.risk_score || 0;
  const color = score >= 95 ? '#EF4444' : score >= 85 ? '#F97316' : score >= 60 ? '#F59E0B' : score >= 30 ? '#3B82F6' : '#10B981';
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="detail-drawer relative w-full max-w-md glass-panel border-l border-border-subtle h-full overflow-y-auto">
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="text-lg font-bold text-text-primary">Transaction Details</h2>
            <button onClick={onClose} className="p-1 hover:bg-background-tertiary rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          <div className="flex flex-col items-center mb-4 lg:mb-6">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r="40%" stroke="#1E293B" strokeWidth="6" fill="none" />
                <circle cx="50%" cy="50%" r="40%" stroke={color} strokeWidth="6" fill="none" strokeDasharray={`${(score / 100) * 251} 251`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl lg:text-2xl font-bold text-text-primary">{score}</span>
                <span className="text-xs text-text-muted">/100</span>
              </div>
            </div>
            <span className="mt-2 text-sm font-semibold" style={{ color }}>{transaction.risk_band || 'Unknown'}</span>
          </div>
          <div className="space-y-3">
            {[['Transaction ID', `#${transaction.id || '—'}`], ['Type', transaction.type || '—'], ['Amount', transaction.amount !== undefined ? `$${transaction.amount.toLocaleString()}` : '—'], ['From', transaction.nameOrig || '—'], ['To', transaction.nameDest || '—'], ['Anomaly', transaction.is_anomaly ? 'Yes' : 'No'], ['Created', formatTime(transaction.created_at)]].map(([label, value]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border-subtle/50">
                <span className="text-text-muted text-sm">{label}</span>
                <span className="text-text-primary text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
          {transaction.shap_values && (
            <div className="mt-4 lg:mt-6">
              <h3 className="text-text-primary font-semibold mb-3">SHAP Explanation</h3>
              <ShapMiniChart shapValues={transaction.shap_values} />
            </div>
          )}
          <div className="mt-6">
            <Link
              to={`/explainability?id=${transaction.id}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg font-medium transition-colors"
            >
              <Activity className="w-4 h-4" /> View Full AI Explainability
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [filters, setFilters] = useState({ type: '', riskBand: '', status: '', minAmount: '', maxAmount: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [useMock, setUseMock] = useState(false);

  const offset = (page - 1) * pageSize;
  const { transactions: apiTransactions, count: totalCount, loading, error, refetch } = useTransactions(50, offset);
  const { data: statsData } = useStats();

  useEffect(() => {
    if (totalCount > 0 && page > 1 && (page - 1) * pageSize >= totalCount) setPage(1);
  }, [totalCount, page, pageSize]);

  useEffect(() => {
    if (error && !useMock) setUseMock(true);
  }, [error, useMock]);

  const rawTransactions = useMock ? [] : (apiTransactions || []);
  const totalItems = useMock ? 0 : (totalCount || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const filteredTransactions = useMemo(() => {
    let result = [...rawTransactions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(tx => (tx.id?.toString() || '').includes(q) || (tx.nameOrig || '').toLowerCase().includes(q) || (tx.amount?.toString() || '').includes(q));
    }
    if (filters.type) result = result.filter(tx => tx.type === filters.type);
    if (filters.riskBand) result = result.filter(tx => tx.risk_band === filters.riskBand);
    if (filters.status === 'anomaly') result = result.filter(tx => tx.is_anomaly);
    else if (filters.status === 'normal') result = result.filter(tx => !tx.is_anomaly);
    if (filters.minAmount) result = result.filter(tx => tx.amount >= parseFloat(filters.minAmount));
    if (filters.maxAmount) result = result.filter(tx => tx.amount <= parseFloat(filters.maxAmount));
    result.sort((a, b) => {
      let aVal = a[sortField], bVal = b[sortField];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return result;
  }, [rawTransactions, search, filters, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-text-muted" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-accent-info" /> : <ArrowDown className="w-3 h-3 text-accent-info" />;
  };

  const goToPage = (p) => { if (p >= 1 && p <= totalPages) setPage(p); };

  const anomalyCount = statsData?.anomalies_detected ?? filteredTransactions.filter(tx => tx.is_anomaly).length;
  const criticalCount = statsData?.critical_count ?? filteredTransactions.filter(tx => tx.risk_band === 'Critical').length;
  const avgRisk = statsData?.avg_risk_score?.toFixed(1) ?? (filteredTransactions.length > 0 ? (filteredTransactions.reduce((sum, tx) => sum + (tx.risk_score || 0), 0) / filteredTransactions.length).toFixed(1) : '0.0');

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-text-primary truncate">Transactions</h1>
          <p className="text-text-muted text-sm mt-1">Monitor, filter, and inspect all transaction records</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setUseMock(!useMock)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${useMock ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-background-tertiary text-text-muted border-border-subtle hover:text-text-primary'}`}>
            {useMock ? 'Mock' : 'Live'}
          </button>
          <button onClick={refetch} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-tertiary border border-border-subtle text-text-muted text-xs hover:text-text-primary transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[{ label: 'Total', value: totalItems.toLocaleString(), color: 'text-accent-info', icon: Shield }, { label: 'Anomalies', value: anomalyCount.toLocaleString(), color: 'text-red-400', icon: AlertTriangle }, { label: 'Critical', value: criticalCount.toLocaleString(), color: 'text-purple-400', icon: TrendingUp }, { label: 'Avg Risk', value: avgRisk, color: 'text-amber-400', icon: Activity }].map(stat => (
          <div key={stat.label} className="glass-panel border border-border-subtle rounded-xl p-3 lg:p-4 flex items-center gap-3 card-hover">
            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-background-tertiary flex items-center justify-center ${stat.color} flex-shrink-0`}>
              <stat.icon size={18} className="lg:w-5 lg:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-text-muted text-[10px] lg:text-xs uppercase tracking-wider truncate">{stat.label}</p>
              <p className={`text-lg lg:text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search by ID, name, or amount..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info/20" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors flex-shrink-0 ${showFilters || activeFilterCount > 0 ? 'bg-accent-info/10 text-accent-info border-accent-info/30' : 'bg-background-tertiary text-text-primary border-border-subtle hover:border-border-accent'}`}>
          <Filter className="w-4 h-4" /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="glass-panel rounded-xl p-4 border border-border-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <select value={filters.type} onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }} className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info">
              <option value="">All Types</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="CASH_OUT">CASH_OUT</option>
              <option value="CASH_IN">CASH_IN</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="DEBIT">DEBIT</option>
            </select>
            <select value={filters.riskBand} onChange={(e) => { setFilters(f => ({ ...f, riskBand: e.target.value })); setPage(1); }} className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info">
              <option value="">All Risk Bands</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <select value={filters.status} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }} className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-info">
              <option value="">All Status</option>
              <option value="anomaly">Anomaly</option>
              <option value="normal">Normal</option>
            </select>
            <input type="number" placeholder="Min Amount" value={filters.minAmount} onChange={(e) => { setFilters(f => ({ ...f, minAmount: e.target.value })); setPage(1); }} className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info" />
            <input type="number" placeholder="Max Amount" value={filters.maxAmount} onChange={(e) => { setFilters(f => ({ ...f, maxAmount: e.target.value })); setPage(1); }} className="px-3 py-2 bg-background-tertiary border border-border-subtle rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-info" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(filters).map(([key, value]) => value && (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-info/10 text-accent-info text-xs">
                {key}: {value} <button onClick={() => { setFilters(f => ({ ...f, [key]: '' })); setPage(1); }}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {activeFilterCount > 0 && <button onClick={() => { setFilters({ type: '', riskBand: '', status: '', minAmount: '', maxAmount: '' }); setPage(1); }} className="text-text-muted text-xs hover:text-text-primary">Clear all</button>}
          </div>
        </div>
      )}

      {/* MOBILE CARD VIEW */}
      <div className="lg:hidden space-y-3">
        {filteredTransactions.map((tx) => (
          <div key={tx.id} onClick={() => setSelectedTx(tx)} className="glass-panel border border-border-subtle rounded-xl p-4 active:bg-background-tertiary/50 card-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-text-primary text-sm">#{tx.id}</span>
              <StatusBadge band={tx.risk_band || 'Low'} isAnomaly={tx.is_anomaly} />
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_CONFIG[tx.type]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                {TYPE_CONFIG[tx.type]?.icon || '•'} {tx.type}
              </span>
              <span className="text-text-primary font-mono">${tx.amount?.toLocaleString() || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="w-20 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(tx.risk_score || 0, 100)}%`, backgroundColor: tx.risk_score >= 95 ? '#EF4444' : tx.risk_score >= 85 ? '#F97316' : tx.risk_score >= 60 ? '#F59E0B' : tx.risk_score >= 30 ? '#3B82F6' : '#10B981' }} />
              </div>
              <span className="text-text-muted text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatTime(tx.created_at)}
              </span>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && !loading && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No transactions found</p>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block glass-panel border border-border-subtle rounded-xl overflow-hidden card-hover">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent-info" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <WifiOff className="w-12 h-12 text-accent-danger mb-4" />
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {error === 'Unable to connect to the server. It might be starting up or offline.' ? 'Connection Failed' : 'Error Loading Transactions'}
            </h3>
            <p className="text-text-secondary max-w-md text-sm mb-6">{typeof error === 'string' ? error : "Unable to load transactions. The backend server might be starting up or unavailable."}</p>
            <button onClick={refetch} className="px-6 py-2 bg-background-tertiary border border-border-subtle hover:bg-background-tertiary/80 text-text-primary rounded-lg text-sm transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-background-tertiary/50">
                  {[{ key: 'id', label: 'ID', sortable: true }, { key: 'type', label: 'Type', sortable: true }, { key: 'amount', label: 'Amount', sortable: true }, { key: 'risk_score', label: 'Risk', sortable: true }, { key: 'risk_band', label: 'Status', sortable: false }, { key: 'shap_values', label: 'SHAP', sortable: false }, { key: 'created_at', label: 'Time', sortable: true }, { key: 'actions', label: 'Actions', sortable: false }].map(col => (
                    <th key={col.key || col.label} onClick={() => col.sortable && handleSort(col.key)} className={`text-left text-text-muted text-xs font-medium py-3 px-4 ${col.sortable ? 'cursor-pointer hover:text-text-primary' : ''}`}>
                      <div className="flex items-center gap-1">{col.label} {col.sortable && <SortIcon field={col.key} />}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredTransactions.map((tx, i) => (
                  <tr key={tx.id || i} onClick={() => setSelectedTx(tx)} className="hover:bg-background-tertiary/30 transition-colors cursor-pointer group">
                    <td className="py-3 px-4 text-text-primary text-sm font-mono">#{tx.id || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${TYPE_CONFIG[tx.type]?.color || 'bg-gray-500/20 text-gray-400'}`}>{TYPE_CONFIG[tx.type]?.icon || '•'} {tx.type}</span>
                    </td>
                    <td className="py-3 px-4 text-text-primary text-sm">${tx.amount?.toLocaleString() || '—'}</td>
                    <td className="py-3 px-4"><RiskBar score={tx.risk_score} /></td>
                    <td className="py-3 px-4"><StatusBadge band={tx.risk_band || 'Low'} isAnomaly={tx.is_anomaly} /></td>
                    <td className="py-3 px-4 max-w-[150px] overflow-hidden"><ShapMiniChart shapValues={tx.shap_values} /></td>
                    <td className="py-3 px-4 text-text-muted text-xs"><div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(tx.created_at)}</div></td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/explainability?id=${tx.id}`; }}
                        className="p-1 hover:bg-accent-info/20 rounded text-accent-info tooltip-trigger relative"
                        title="View SHAP Explainability"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <Eye className="w-4 h-4 text-text-muted group-hover:text-accent-info transition-colors" />
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center"><Search className="w-8 h-8 text-text-muted mx-auto mb-2" /><p className="text-text-muted text-sm">No transactions found</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-bar flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="page-info-text text-text-muted text-sm">Page {page} of {totalPages}</span>
          <span className="text-text-muted text-xs">({totalItems.toLocaleString()} items)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => goToPage(1)} disabled={page === 1} className="page-btn p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30"><ChevronsLeft className="w-4 h-4 text-text-muted" /></button>
          <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="page-btn p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30"><ChevronLeft className="w-4 h-4 text-text-muted" /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages));
            if (pageNum < 1 || pageNum > totalPages) return null;
            return <button key={pageNum} onClick={() => goToPage(pageNum)} className={`page-btn w-8 h-8 rounded-lg text-sm font-medium ${page === pageNum ? 'bg-accent-info text-white' : 'text-text-muted hover:bg-background-tertiary hover:text-text-primary'}`}>{pageNum}</button>;
          })}
          <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="page-btn p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30"><ChevronRight className="w-4 h-4 text-text-muted" /></button>
          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="page-btn p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-30"><ChevronsRight className="w-4 h-4 text-text-muted" /></button>
        </div>
      </div>

      {selectedTx && <DetailDrawer transaction={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}
