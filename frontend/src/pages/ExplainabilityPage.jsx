import {
  Activity,
  AlertTriangle,
  ArrowUp,
  Brain,
  ChevronDown,
  Download,
  Loader2,
  Search,
  Shield,
  Sparkles
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePredict, useTransactions } from '../hooks/useApi';
import { useSearchParams } from 'react-router-dom';
import { getTransactionById } from '../lib/axios';

// ─── Mock fallback transactions ───────────────────────────────
const MOCK_TRANSACTIONS = [
  { id: 1, step: 1, type: 'TRANSFER', amount: 181, nameOrig: 'C1231006815', oldbalanceOrg: 181, newbalanceOrig: 0, nameDest: 'C1970109150', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6213, is_new_dest: true, is_round_amount: true, hour_of_step: 1, shap_values: { is_round_amount: 1.6856, type_TRANSFER: 1.1378, hour_of_step: 0.8483, hour_of_step_cos: 0.7902, is_new_dest: 0.2155, balance_diff_orig: 0.1876, amount_log: 0.1234, is_balance_zeroed_orig: 0.9876 }, created_at: '2024-01-15T10:30:00Z' },
  { id: 6, step: 2, type: 'TRANSFER', amount: 420000, nameOrig: 'C99999', oldbalanceOrg: 420000, newbalanceOrig: 0, nameDest: 'C88888', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7123, is_new_dest: true, is_round_amount: true, hour_of_step: 2, shap_values: { is_round_amount: 1.8765, type_TRANSFER: 1.2345, amount_log: 1.1234, is_balance_zeroed_orig: 0.9876, is_new_dest: 0.5432, hour_of_step: 0.8765, balance_diff_orig: 0.7654, hour_of_step_sin: 0.6543 }, created_at: '2024-01-15T11:00:00Z' },
  { id: 13, step: 6, type: 'TRANSFER', amount: 1000000, nameOrig: 'C14141', oldbalanceOrg: 1000000, newbalanceOrig: 0, nameDest: 'C15151', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8234, is_new_dest: true, is_round_amount: true, hour_of_step: 6, shap_values: { amount_log: 1.5432, is_round_amount: 1.4321, type_TRANSFER: 1.2345, is_balance_zeroed_orig: 1.1234, is_new_dest: 0.9876, hour_of_step: 0.8765, balance_diff_orig: 0.7654, hour_of_step_cos: 0.6543 }, created_at: '2024-01-15T14:00:00Z' },
  { id: 3, step: 1, type: 'CASH_OUT', amount: 229133.94, nameOrig: 'C905333901', oldbalanceOrg: 15325, newbalanceOrig: 0, nameDest: 'M573053279', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 87, risk_band: 'High', is_anomaly: true, anomaly_score: -0.4123, is_new_dest: false, is_round_amount: false, hour_of_step: 1, shap_values: { amount_log: 0.9876, is_balance_zeroed_orig: 0.8765, type_CASH_OUT: 0.6543, hour_of_step: 0.4321, balance_diff_orig: 0.3456, is_new_dest: 0.2345, hour_of_step_sin: 0.1234, amount: 0.0987 }, created_at: '2024-01-15T10:32:00Z' },
  { id: 4, step: 2, type: 'PAYMENT', amount: 11668.14, nameOrig: 'C12345', oldbalanceOrg: 41554, newbalanceOrig: 29885.86, nameDest: 'M123', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 12, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.2341, is_new_dest: false, is_round_amount: false, hour_of_step: 2, shap_values: { type_PAYMENT: -0.5432, amount_log: -0.4321, is_new_dest: -0.1234, hour_of_step: -0.0987, balance_diff_orig: -0.0876, hour_of_step_cos: -0.0765, amount: -0.0654, is_balance_zeroed_orig: -0.0543 }, created_at: '2024-01-15T11:05:00Z' },
  { id: 19, step: 9, type: 'PAYMENT', amount: 99999, nameOrig: 'C25252', oldbalanceOrg: 100000, newbalanceOrig: 1, nameDest: 'M444', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 71, risk_band: 'High', is_anomaly: true, anomaly_score: -0.2345, is_new_dest: false, is_round_amount: true, hour_of_step: 9, shap_values: { is_balance_zeroed_orig: 0.8765, amount_log: 0.6543, type_PAYMENT: 0.2345, is_round_amount: 0.1234, hour_of_step: 0.0987, balance_diff_orig: 0.0876, is_new_dest: 0.0765, hour_of_step_cos: 0.0654 }, created_at: '2024-01-15T17:00:00Z' },
  { id: 32, step: 15, type: 'TRANSFER', amount: 666666, nameOrig: 'C44444', oldbalanceOrg: 666666, newbalanceOrig: 0, nameDest: 'C45454', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8456, is_new_dest: true, is_round_amount: true, hour_of_step: 15, shap_values: { amount_log: 1.7654, is_round_amount: 1.6543, type_TRANSFER: 1.5432, is_balance_zeroed_orig: 1.4321, is_new_dest: 1.2345, hour_of_step: 0.9876, balance_diff_orig: 0.8765, hour_of_step_sin: 0.7654 }, created_at: '2024-01-15T23:00:00Z' },
  { id: 44, step: 21, type: 'TRANSFER', amount: 999999, nameOrig: 'C62626', oldbalanceOrg: 999999, newbalanceOrig: 0, nameDest: 'C63636', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.9234, is_new_dest: true, is_round_amount: true, hour_of_step: 21, shap_values: { amount_log: 1.9876, is_round_amount: 1.8765, type_TRANSFER: 1.7654, is_balance_zeroed_orig: 1.6543, is_new_dest: 1.4321, hour_of_step: 1.2345, balance_diff_orig: 1.1234, hour_of_step_cos: 0.9876 }, created_at: '2024-01-16T05:00:00Z' },
];

// ─── Format time helper ─────────────────────────────────────
const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

// ─── SHAP Waterfall Chart ───────────────────────────────────
const ShapWaterfallChart = ({ shapValues, baseValue = -0.1 }) => {
  if (!shapValues || Object.keys(shapValues).length === 0) return null;

  const entries = Object.entries(shapValues)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 10);

  let currentCumulative = baseValue;
  const data = [{ feature: 'Base Value', value: baseValue, cumulative: baseValue, color: '#3B82F6' }];
  for (const [feature, value] of entries) {
    currentCumulative += value;
    data.push({
      feature: feature.replace(/_/g, ' '),
      value,
      cumulative: currentCumulative,
      color: value > 0 ? '#EF4444' : '#10B981',
    });
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
          <XAxis type="number" stroke="#64748B" fontSize={12} />
          <YAxis dataKey="feature" type="category" stroke="#94A3B8" fontSize={11} width={140} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              border: '1px solid #1E293B',
              borderRadius: '8px',
              color: '#F8FAFC',
            }}
            formatter={(value) => [value.toFixed(4), 'SHAP Value']}
          />
          <ReferenceLine x={0} stroke="#64748B" strokeDasharray="3 3" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/70 border border-red-500/90" /> Increases risk</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/70 border border-emerald-500/90" /> Decreases risk</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-500" /> Base value</span>
      </div>
    </div>
  );
};

// ─── Feature Importance List ────────────────────────────────
const FeatureImportanceList = ({ shapValues }) => {
  if (!shapValues) return null;
  const entries = Object.entries(shapValues)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 8);

  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)));

  return (
    <div className="space-y-2">
      {entries.map(([feature, value], i) => (
        <div key={feature} className="flex items-center gap-3">
          <span className="text-slate-500 text-xs w-5">{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-slate-200 text-xs font-medium">{feature.replace(/_/g, ' ')}</span>
              <span className={`text-xs font-mono ${value > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {value > 0 ? '+' : ''}{value.toFixed(3)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(Math.abs(value) / maxVal) * 100}%`,
                  backgroundColor: value > 0 ? '#EF4444' : '#10B981',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Model Decision Card ────────────────────────────────────
const ModelDecisionCard = ({ transaction, shapValues }) => {
  const reasons = useMemo(() => {
    const r = [];
    if (transaction.newbalanceOrig === 0 && transaction.oldbalanceOrg > 0) {
      r.push({ icon: AlertTriangle, text: 'Balance completely zeroed after transaction', severity: 'high' });
    }
    if (transaction.type === 'TRANSFER') {
      r.push({ icon: ArrowUp, text: 'TRANSFER type — highest fraud correlation', severity: 'high' });
    }
    if (transaction.amount > 100000) {
      r.push({ icon: Activity, text: `High amount ($${transaction.amount.toLocaleString()})`, severity: 'medium' });
    }
    if (shapValues?.is_round_amount > 1) {
      r.push({ icon: Shield, text: 'Round amount detected — common fraud pattern', severity: 'high' });
    }
    if (shapValues?.is_new_dest > 0.5) {
      r.push({ icon: ArrowUp, text: 'New destination account', severity: 'medium' });
    }
    return r;
  }, [transaction, shapValues]);

  return (
    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
      <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        Model Decision Logic
      </h3>
      <div className="space-y-2">
        {reasons.map((reason, i) => (
          <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg ${reason.severity === 'high' ? 'bg-red-500/5 border border-red-500/10' :
            reason.severity === 'medium' ? 'bg-amber-500/5 border border-amber-500/10' :
              'bg-slate-800/30'
            }`}>
            <reason.icon className={`w-4 h-4 mt-0.5 shrink-0 ${reason.severity === 'high' ? 'text-red-400' :
              reason.severity === 'medium' ? 'text-amber-400' :
                'text-slate-500'
              }`} />
            <span className="text-slate-400 text-sm">{reason.text}</span>
          </div>
        ))}
        {reasons.length === 0 && (
          <p className="text-slate-500 text-sm">No significant risk factors detected.</p>
        )}
      </div>
    </div>
  );
};

// ─── Risk Factors Card ──────────────────────────────────────
const RiskFactorsCard = ({ transaction }) => {
  const isCritical = transaction.risk_band === 'Critical';
  const isHigh = transaction.risk_band === 'High';

  return (
    <div className={`bg-slate-900/50 rounded-xl p-5 border ${isCritical ? 'border-red-500/20' : isHigh ? 'border-amber-500/20' : 'border-slate-700/30'
      }`}>
      <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-cyan-400" />
        Risk Assessment
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Risk Level</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isCritical ? 'bg-red-500/20 text-red-400' :
            isHigh ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
            {transaction.risk_band}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Anomaly Detected</span>
          <span className={`text-sm font-medium ${transaction.is_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
            {transaction.is_anomaly ? 'Yes' : 'No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Amount</span>
          <span className="text-slate-200 text-sm font-medium">${transaction.amount?.toLocaleString()}</span>
        </div>
        {/* ✅ FIX: Add timestamp */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Processed</span>
          <span className="text-slate-300 text-xs">{formatTime(transaction.created_at)}</span>
        </div>
        {transaction.amount > 500000 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-400 text-xs">Mega transfer detected — exceeds $500K threshold</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Transaction Selector ─────────────────────────────────────
const TransactionSelector = ({ transactions, selected, onSelect, search, onSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filtered = transactions.filter(tx =>
    (tx.id?.toString() || '').includes(search) ||
    (tx.nameOrig || '').toLowerCase().includes(search.toLowerCase()) ||
    (tx.type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative max-w-xl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">Transaction</span>
          {selected && (
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs font-medium">
              #{selected.id || selected.transaction_id} — {selected.type} (${selected.amount?.toLocaleString()})
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(tx => (
              <button
                key={tx.id || tx.transaction_id}
                onClick={() => { onSelect(tx); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 ${selected?.id === tx.id ? 'bg-cyan-500/5' : ''
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 text-sm font-mono">#{tx.id || tx.transaction_id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${tx.type === 'TRANSFER' ? 'bg-purple-500/20 text-purple-400' :
                    tx.type === 'CASH_OUT' ? 'bg-amber-500/20 text-amber-400' :
                      tx.type === 'PAYMENT' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-emerald-500/20 text-emerald-400'
                    }`}>{tx.type}</span>
                  <span className="text-slate-400 text-xs">${tx.amount?.toLocaleString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.risk_band === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  tx.risk_band === 'High' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{tx.risk_band}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-slate-500 text-sm">No transactions found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Explainability Page ─────────────────────────────────
export default function ExplainabilityPage() {
  const [selectedTx, setSelectedTx] = useState(null);
  const [search, setSearch] = useState('');
  const [useMock, setUseMock] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState(null);
  const [explainResult, setExplainResult] = useState(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const [searchParams] = useSearchParams();
  const urlId = searchParams.get('id');

  const { transactions: apiTransactions, error: txError } = useTransactions(200, 0);
  const { predict } = usePredict();

  // Auto-fallback to mock on API error
  useEffect(() => {
    if (txError && !useMock) {
      console.warn('API error, using mock data:', txError);
      setUseMock(true);
    }
  }, [txError, useMock]);

  const transactions = useMemo(() => useMock ? MOCK_TRANSACTIONS : (apiTransactions || []), [useMock, apiTransactions]);

  // Reset auto-selected status when urlId changes
  useEffect(() => {
    setHasAutoSelected(false);
  }, [urlId]);

  // Auto-select transaction from URL ?id= param, then fall back to first
  useEffect(() => {
    if (transactions.length > 0 && !hasAutoSelected) {
      if (urlId) {
        const match = transactions.find(tx => String(tx.id) === String(urlId));
        if (match) {
          setSelectedTx(match);
          setHasAutoSelected(true);
          return;
        } else if (!useMock) {
          // If the transaction with urlId is not in the first page of transactions, fetch it directly
          setExplainLoading(true);
          setExplainError(null);
          getTransactionById(urlId)
            .then(tx => {
              if (tx) {
                setSelectedTx(tx);
              } else {
                setSelectedTx(transactions[0]);
              }
            })
            .catch(err => {
              console.error('Failed to fetch transaction by ID:', err);
              setSelectedTx(transactions[0]);
            })
            .finally(() => {
              setHasAutoSelected(true);
              setExplainLoading(false);
            });
          return;
        }
      }
      // fallback: select first transaction
      setSelectedTx(transactions[0]);
      setHasAutoSelected(true);
    }
  }, [transactions, urlId, hasAutoSelected, useMock]);

  // Fetch SHAP explanation when transaction changes
  useEffect(() => {
    if (!selectedTx || useMock) {
      // For mock data, use embedded shap_values
      if (selectedTx?.shap_values) {
        setExplainResult({
          shap_values: selectedTx.shap_values,
          risk_score: selectedTx.risk_score,
          risk_band: selectedTx.risk_band,
          is_anomaly: selectedTx.is_anomaly,
        });
      }
      return;
    }

    const fetchExplanation = async () => {
      setExplainLoading(true);
      setExplainError(null);
      try {
        const txData = {
          step: selectedTx.step || 1,
          type: selectedTx.type,
          amount: selectedTx.amount,
          nameOrig: selectedTx.nameOrig,
          oldbalanceOrg: selectedTx.oldbalanceOrg,
          newbalanceOrig: selectedTx.newbalanceOrig,
          nameDest: selectedTx.nameDest,
          oldbalanceDest: selectedTx.oldbalanceDest,
          newbalanceDest: selectedTx.newbalanceDest,
        };
        const result = await predict(txData, true);
        setExplainResult(result);
      } catch (err) {
        setExplainError(err.userMessage || err.message || 'Failed to get explanation');
        // Fallback to mock SHAP
        if (selectedTx.shap_values) {
          setExplainResult({
            shap_values: selectedTx.shap_values,
            risk_score: selectedTx.risk_score,
            risk_band: selectedTx.risk_band,
            is_anomaly: selectedTx.is_anomaly,
          });
        }
      } finally {
        setExplainLoading(false);
      }
    };

    fetchExplanation();
  }, [selectedTx, useMock, predict]);

  // ✅ FIX: Export report functionality
  const exportReport = () => {
    if (!selectedTx || !explainResult) return;
    
    const report = {
      transaction: selectedTx,
      explanation: explainResult,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explainability_report_tx_${selectedTx.id || selectedTx.transaction_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shapValues = explainResult?.shap_values || selectedTx?.shap_values;

  const riskColor = selectedTx?.risk_score >= 90 ? 'text-red-400' : selectedTx?.risk_score >= 70 ? 'text-orange-400' : selectedTx?.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400';
  const ringColor = selectedTx?.risk_score >= 90 ? '#ef4444' : selectedTx?.risk_score >= 70 ? '#f97316' : selectedTx?.risk_score >= 30 ? '#f59e0b' : '#10b981';

  return (
    <div className="p-6 space-y-6" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <Brain size={28} className="text-cyan-400" />
            Explainability
          </h1>
          <p className="text-sm text-slate-500 mt-1">SHAP-powered model explanations for every prediction</p>
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ FIX: Working export button */}
          <button 
            onClick={exportReport}
            disabled={!selectedTx || !explainResult}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={() => setUseMock(!useMock)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${useMock
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
          >
            {useMock ? 'Using Mock Data' : 'Using Live API'}
          </button>
        </div>
      </div>

      {/* Transaction Selector */}
      <TransactionSelector
        transactions={transactions}
        selected={selectedTx}
        onSelect={setSelectedTx}
        search={search}
        onSearch={setSearch}
      />

      {/* Transaction Summary Bar */}
      {selectedTx && (
        <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="4" fill="none" />
                <circle
                  cx="32" cy="32" r="28"
                  stroke={ringColor}
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(selectedTx.risk_score / 100) * 175.93} 175.93`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold font-mono ${riskColor}`}>{selectedTx.risk_score}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-300 font-medium">Transaction #{selectedTx.id || selectedTx.transaction_id}</div>
              <div className="text-xs text-slate-500">{selectedTx.type} · Step {selectedTx.step}</div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-700/50 hidden sm:block" />

          <div className="flex items-center gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Amount</div>
              <div className="font-mono text-slate-200">${selectedTx.amount?.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">From</div>
              <div className="font-mono text-slate-300">{selectedTx.nameOrig}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">To</div>
              <div className="font-mono text-slate-300">{selectedTx.nameDest}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Status</div>
              <div className={`font-medium ${selectedTx.is_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                {selectedTx.is_anomaly ? 'Anomaly' : 'Normal'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {explainLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
            {explainError && <span className="text-red-400 text-xs">{explainError}</span>}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {selectedTx && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: SHAP Waterfall + Feature Importance */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-200">SHAP Waterfall Chart</h3>
                </div>
                <span className="text-xs text-slate-500">Top 10 features</span>
              </div>
              {explainLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : shapValues ? (
                <ShapWaterfallChart shapValues={shapValues} baseValue={-0.1} />
              ) : (
                <p className="text-slate-500 text-sm text-center py-20">No SHAP data available</p>
              )}
            </div>

            <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">Feature Importance Ranking</h3>
              </div>
              {shapValues ? (
                <FeatureImportanceList shapValues={shapValues} />
              ) : (
                <p className="text-slate-500 text-sm">No data</p>
              )}
            </div>
          </div>

          {/* Right: Decision Cards */}
          <div className="lg:col-span-2 space-y-4">
            <ModelDecisionCard transaction={selectedTx} shapValues={shapValues} />
            <RiskFactorsCard transaction={selectedTx} />

            {/* SHAP Value Summary */}
            {shapValues && (
              <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">SHAP Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Top Driver</span>
                    <span className="text-slate-300 font-medium">
                      {Object.entries(shapValues).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0].replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Features Analyzed</span>
                    <span className="text-slate-300 font-mono">{Object.keys(shapValues).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max |SHAP|</span>
                    <span className="text-slate-300 font-mono">
                      {Math.max(...Object.values(shapValues).map(Math.abs)).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum of |SHAP|</span>
                    <span className="text-slate-300 font-mono">
                      {Object.values(shapValues).reduce((a, b) => a + Math.abs(b), 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
