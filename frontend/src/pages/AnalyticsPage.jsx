import { Activity, BarChart3, Brain, Layers, Shield, Target, TrendingUp, Zap } from 'lucide-react';
import FeatureDistributionChart from '../components/analytics/FeatureDistributionChart';
import FraudTypeChart from '../components/analytics/FraudTypeChart';
import LiftChart from '../components/analytics/LiftChart';
import MetricCard from '../components/analytics/MetricCard';
import RiskDistributionChart from '../components/analytics/RiskDistributionChart';
import RocPrChart from '../components/analytics/RocPrChart';

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <BarChart3 size={28} className="text-cyan-400" />
          Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">Model performance metrics, feature insights, and fraud pattern analysis</p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="ROC-AUC Score"
          value="0.8946"
          subtitle="Excellent discrimination"
          trend="up"
          trendValue="+0.34 vs LOF"
          icon={Target}
          color="cyan"
        />
        <MetricCard
          title="Lift @ Top 1%"
          value="109×"
          subtitle="vs random baseline"
          trend="up"
          trendValue="Top performance"
          icon={Zap}
          color="amber"
        />
        <MetricCard
          title="Fraud Separation"
          value="1.76×"
          subtitle="Fraud vs Normal mean risk"
          trend="up"
          trendValue="Day 7 validation"
          icon={Shield}
          color="emerald"
        />
        <MetricCard
          title="Precision @ Top 5%"
          value="4.2%"
          subtitle="of predictions are fraud"
          trend="up"
          trendValue="32× lift"
          icon={Brain}
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROC Curve */}
        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">ROC Curve</h3>
            </div>
            <span className="text-xs text-slate-500">Isolation Forest vs Random</span>
          </div>
          <RocPrChart />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Model: <span className="text-cyan-400 font-mono">isolation_forest_v1.0.0</span></span>
            <span>Dataset: <span className="text-slate-300">PaySim (6.3M rows)</span></span>
          </div>
        </div>

        {/* Feature Distribution */}
        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Feature Importance</h3>
            </div>
            <span className="text-xs text-slate-500">Mean |SHAP| — Fraud vs Normal</span>
          </div>
          <FeatureDistributionChart />
          <div className="mt-3 text-xs text-slate-500">
            <span className="text-red-400">Red</span> = Fraud transactions · <span className="text-emerald-400">Green</span> = Normal transactions
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud by Type */}
        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Fraud by Type</h3>
          </div>
          <FraudTypeChart />
        </div>

        {/* Lift Chart */}
        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Precision by Percentile</h3>
          </div>
          <LiftChart />
          <div className="mt-3 text-xs text-slate-500 text-center">
            Top 1% of anomaly scores contain <span className="text-cyan-400 font-medium">10.9%</span> fraud (109× lift)
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Risk Score Distribution</h3>
          </div>
          <RiskDistributionChart />
          <div className="mt-3 text-xs text-slate-500 text-center">
            Fraud mean: <span className="text-red-400 font-mono">87.4</span> · Normal mean: <span className="text-emerald-400 font-mono">49.6</span>
          </div>
        </div>
      </div>

      {/* Key Insights Banner */}
      <div className="bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 border border-cyan-500/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Brain size={16} className="text-cyan-400" /> Key Insights from Model Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-cyan-400 font-medium">Unsupervised Validation</div>
            <p className="text-slate-400 text-xs leading-relaxed">Model trained without labels achieves 0.89 ROC-AUC when validated against held-out fraud labels — proving anomaly detection works.</p>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-medium">Inverted Balance Anomaly</div>
            <p className="text-slate-400 text-xs leading-relaxed">Day 2 EDA discovery: transactions where originator balance drops to exactly zero after transfer are the strongest fraud signal.</p>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-medium">Type-Constrained Fraud</div>
            <p className="text-slate-400 text-xs leading-relaxed">100% of fraud occurs in TRANSFER (0.77%) and CASH_OUT (0.18%) types. PAYMENT, CASH_IN, and DEBIT have zero fraud.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
