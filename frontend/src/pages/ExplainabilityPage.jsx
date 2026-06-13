import { Activity, Brain, Download, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import FeatureImportanceList from '../components/explain/FeatureImportanceList';
import ModelDecisionCard from '../components/explain/ModelDecisionCard';
import RiskFactorsCard from '../components/explain/RiskFactorsCard';
import ShapWaterfallChart from '../components/explain/ShapWaterfallChart';
import TransactionSelector from '../components/explain/TransactionSelector';

// Full transaction data (same as Transactions page + more)
const FULL_TRANSACTIONS = {
  1: { id: 1, step: 1, type: 'TRANSFER', amount: 181, nameOrig: 'C1231006815', oldbalanceOrg: 181, newbalanceOrig: 0, nameDest: 'C1970109150', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 99, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.6213, is_new_dest: true, is_round_amount: true, hour_of_step: 1, shap_values: { is_round_amount: 1.6856, type_TRANSFER: 1.1378, hour_of_step: 0.8483, hour_of_step_cos: 0.7902, is_new_dest: 0.2155, balance_diff_orig: 0.1876, amount_log: 0.1234, is_balance_zeroed_orig: 0.9876 } },
  6: { id: 6, step: 2, type: 'TRANSFER', amount: 420000, nameOrig: 'C99999', oldbalanceOrg: 420000, newbalanceOrig: 0, nameDest: 'C88888', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.7123, is_new_dest: true, is_round_amount: true, hour_of_step: 2, shap_values: { is_round_amount: 1.8765, type_TRANSFER: 1.2345, amount_log: 1.1234, is_balance_zeroed_orig: 0.9876, is_new_dest: 0.5432, hour_of_step: 0.8765, balance_diff_orig: 0.7654, hour_of_step_sin: 0.6543 } },
  13: { id: 13, step: 6, type: 'TRANSFER', amount: 1000000, nameOrig: 'C14141', oldbalanceOrg: 1000000, newbalanceOrig: 0, nameDest: 'C15151', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8234, is_new_dest: true, is_round_amount: true, hour_of_step: 6, shap_values: { amount_log: 1.5432, is_round_amount: 1.4321, type_TRANSFER: 1.2345, is_balance_zeroed_orig: 1.1234, is_new_dest: 0.9876, hour_of_step: 0.8765, balance_diff_orig: 0.7654, hour_of_step_cos: 0.6543 } },
  3: { id: 3, step: 1, type: 'CASH_OUT', amount: 229133.94, nameOrig: 'C905333901', oldbalanceOrg: 15325, newbalanceOrig: 0, nameDest: 'M573053279', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 87, risk_band: 'High', is_anomaly: true, anomaly_score: -0.4123, is_new_dest: false, is_round_amount: false, hour_of_step: 1, shap_values: { amount_log: 0.9876, is_balance_zeroed_orig: 0.8765, type_CASH_OUT: 0.6543, hour_of_step: 0.4321, balance_diff_orig: 0.3456, is_new_dest: 0.2345, hour_of_step_sin: 0.1234, amount: 0.0987 } },
  4: { id: 4, step: 2, type: 'PAYMENT', amount: 11668.14, nameOrig: 'C12345', oldbalanceOrg: 41554, newbalanceOrig: 29885.86, nameDest: 'M123', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 12, risk_band: 'Low', is_anomaly: false, anomaly_score: 0.2341, is_new_dest: false, is_round_amount: false, hour_of_step: 2, shap_values: { type_PAYMENT: -0.5432, amount_log: -0.4321, is_new_dest: -0.1234, hour_of_step: -0.0987, balance_diff_orig: -0.0876, hour_of_step_cos: -0.0765, amount: -0.0654, is_balance_zeroed_orig: -0.0543 } },
  19: { id: 19, step: 9, type: 'PAYMENT', amount: 99999, nameOrig: 'C25252', oldbalanceOrg: 100000, newbalanceOrig: 1, nameDest: 'M444', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 0, risk_score: 71, risk_band: 'High', is_anomaly: true, anomaly_score: -0.2345, is_new_dest: false, is_round_amount: true, hour_of_step: 9, shap_values: { is_balance_zeroed_orig: 0.8765, amount_log: 0.6543, type_PAYMENT: 0.2345, is_round_amount: 0.1234, hour_of_step: 0.0987, balance_diff_orig: 0.0876, is_new_dest: 0.0765, hour_of_step_cos: 0.0654 } },
  32: { id: 32, step: 15, type: 'TRANSFER', amount: 666666, nameOrig: 'C44444', oldbalanceOrg: 666666, newbalanceOrig: 0, nameDest: 'C45454', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.8456, is_new_dest: true, is_round_amount: true, hour_of_step: 15, shap_values: { amount_log: 1.7654, is_round_amount: 1.6543, type_TRANSFER: 1.5432, is_balance_zeroed_orig: 1.4321, is_new_dest: 1.2345, hour_of_step: 0.9876, balance_diff_orig: 0.8765, hour_of_step_sin: 0.7654 } },
  44: { id: 44, step: 21, type: 'TRANSFER', amount: 999999, nameOrig: 'C62626', oldbalanceOrg: 999999, newbalanceOrig: 0, nameDest: 'C63636', oldbalanceDest: 0, newbalanceDest: 0, isFraud: 1, risk_score: 100, risk_band: 'Critical', is_anomaly: true, anomaly_score: -0.9234, is_new_dest: true, is_round_amount: true, hour_of_step: 21, shap_values: { amount_log: 1.9876, is_round_amount: 1.8765, type_TRANSFER: 1.7654, is_balance_zeroed_orig: 1.6543, is_new_dest: 1.4321, hour_of_step: 1.2345, balance_diff_orig: 1.1234, hour_of_step_cos: 0.9876 } },
};

export default function ExplainabilityPage() {
  const [selectedId, setSelectedId] = useState(1);

  const transaction = useMemo(() => FULL_TRANSACTIONS[selectedId], [selectedId]);

  const riskColor = transaction?.risk_score >= 90 ? 'text-red-400' : transaction?.risk_score >= 70 ? 'text-orange-400' : transaction?.risk_score >= 30 ? 'text-amber-400' : 'text-emerald-400';
  const ringColor = transaction?.risk_score >= 90 ? '#ef4444' : transaction?.risk_score >= 70 ? '#f97316' : transaction?.risk_score >= 30 ? '#f59e0b' : '#10b981';

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
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          <Download size={14} /> Export Report
        </button>
      </div>

      {/* Transaction Selector */}
      <div className="max-w-xl">
        <label className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 block">Select Transaction</label>
        <TransactionSelector selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {transaction && (
        <>
          {/* Transaction Summary Bar */}
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
                    strokeDasharray={`${(transaction.risk_score / 100) * 175.93} 175.93`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-bold font-mono ${riskColor}`}>{transaction.risk_score}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300 font-medium">Transaction #{transaction.id}</div>
                <div className="text-xs text-slate-500">{transaction.type} · Step {transaction.step}</div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-700/50 hidden sm:block" />

            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Amount</div>
                <div className="font-mono text-slate-200">${transaction.amount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">From</div>
                <div className="font-mono text-slate-300">{transaction.nameOrig}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">To</div>
                <div className="font-mono text-slate-300">{transaction.nameDest}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Status</div>
                <div className={`font-medium ${transaction.is_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                  {transaction.is_anomaly ? 'Anomaly' : 'Normal'}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: SHAP Waterfall Chart */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200">SHAP Waterfall Chart</h3>
                  </div>
                  <span className="text-xs text-slate-500">Top 10 features</span>
                </div>
                <ShapWaterfallChart shapValues={transaction.shap_values} baseValue={-0.1} />
                <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/70 border border-red-500/90" /> Increases risk</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/70 border border-emerald-500/90" /> Decreases risk</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 border border-blue-500" /> Base value</span>
                </div>
              </div>

              {/* Feature Importance List */}
              <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Feature Importance Ranking</h3>
                </div>
                <FeatureImportanceList shapValues={transaction.shap_values} />
              </div>
            </div>

            {/* Right: Decision Cards */}
            <div className="lg:col-span-2 space-y-4">
              <ModelDecisionCard transaction={transaction} />
              <RiskFactorsCard transaction={transaction} />

              {/* SHAP Value Summary */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">SHAP Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Top Driver</span>
                    <span className="text-slate-300 font-medium">
                      {Object.entries(transaction.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0].replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Features Analyzed</span>
                    <span className="text-slate-300 font-mono">{Object.keys(transaction.shap_values).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max |SHAP|</span>
                    <span className="text-slate-300 font-mono">
                      {Math.max(...Object.values(transaction.shap_values).map(Math.abs)).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sum of |SHAP|</span>
                    <span className="text-slate-300 font-mono">
                      {Object.values(transaction.shap_values).reduce((a, b) => a + Math.abs(b), 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
