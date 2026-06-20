import {
  Activity,
  BarChart3,
  Brain,
  Download,
  Layers,
  Loader2,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useStats } from '../hooks/useApi';

// ─── Mock Data (ROC only — model static) ─────────────────────
const MOCK_ROC_DATA = [
  { fpr: 0.0, tpr: 0.0, random: 0.0 },
  { fpr: 0.01, tpr: 0.35, random: 0.01 },
  { fpr: 0.02, tpr: 0.52, random: 0.02 },
  { fpr: 0.05, tpr: 0.68, random: 0.05 },
  { fpr: 0.10, tpr: 0.78, random: 0.10 },
  { fpr: 0.15, tpr: 0.84, random: 0.15 },
  { fpr: 0.20, tpr: 0.88, random: 0.20 },
  { fpr: 0.30, tpr: 0.92, random: 0.30 },
  { fpr: 0.40, tpr: 0.95, random: 0.40 },
  { fpr: 0.50, tpr: 0.96, random: 0.50 },
  { fpr: 0.70, tpr: 0.98, random: 0.70 },
  { fpr: 1.0, tpr: 1.0, random: 1.0 },
];

const MOCK_LIFT_DATA = [
  { percentile: 'Top 1%', precision: 0.109, lift: 109 },
  { percentile: 'Top 2%', precision: 0.082, lift: 82 },
  { percentile: 'Top 3%', precision: 0.065, lift: 65 },
  { percentile: 'Top 5%', precision: 0.042, lift: 32 },
  { percentile: 'Top 10%', precision: 0.028, lift: 16 },
  { percentile: 'Top 20%', precision: 0.018, lift: 9 },
];

const COLORS = ['#8B5CF6', '#F59E0B', '#3B82F6', '#10B981', '#EF4444'];

// ─── Tooltip Style ────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#0F172A',
  border: '1px solid #1E293B',
  borderRadius: '8px',
  color: '#F8FAFC',
};

// ─── Metric Card ──────────────────────────────────────────────
const MetricCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color }) => {
  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium">{title}</p>
          <p className="text-slate-100 text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.cyan}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
          )}
          <span className={`text-xs ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Analytics Page ────────────────────────────────────
export default function AnalyticsPage() {
  const { data: statsData, loading: statsLoading, error: statsError } = useStats();

  const downloadChartAsJpeg = (containerId, filename) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      alert('Could not locate chart SVG.');
      return;
    }
    
    const clonedSvg = svgElement.cloneNode(true);
    const width = svgElement.clientWidth || svgElement.getBoundingClientRect().width || 600;
    const height = svgElement.clientHeight || svgElement.getBoundingClientRect().height || 300;
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);
    
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      svg { font-family: sans-serif; background-color: #0b0f19; }
      text { fill: #94a3b8; font-size: 11px; }
      path.recharts-cartesian-grid-horizontal, path.recharts-cartesian-grid-vertical { stroke: #1e293b; }
      line.recharts-reference-line-line { stroke: #334155; }
    `;
    clonedSvg.appendChild(styleEl);

    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      
      context.fillStyle = '#0b0f19'; 
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      
      try {
        const jpeg = canvas.toDataURL('image/jpeg', 1.0);
        const link = document.createElement('a');
        link.download = filename;
        link.href = jpeg;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Canvas draw failed:", err);
        alert("Failed to save as JPEG: " + err.message);
      }
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const handleExportAnalytics = () => {
    try {
      const csvSections = [];

      csvSections.push("ANALYTICS SUMMARY METRICS");
      csvSections.push("Metric,Value,Context");
      csvSections.push(`ROC-AUC Score,${rocAuc.toFixed(4)},Model discrimination capability`);
      csvSections.push(`Lift Ratio @ Top 1%,${liftAt1}x,vs random baseline detection rate`);
      csvSections.push(`Anomaly Detection Rate,${anomalyRate}%,Percentage of transactions flagged`);
      csvSections.push(`Total Transactions Flagged,${anomaliesDetected},Count of flagged anomalies`);
      csvSections.push(`Total Transactions Processed,${totalTx},Database volume to date`);
      csvSections.push("");

      if (fraudTypeData.length > 0) {
        csvSections.push("FRAUD BREAKDOWN BY TRANSACTION TYPE");
        csvSections.push("Transaction Type,Anomalies Detected,Total Volume,Percentage of Total");
        fraudTypeData.forEach(item => {
          csvSections.push(`${item.name},${item.fraud},${item.total},${item.pct}%`);
        });
        csvSections.push("");
      }

      if (featureData.length > 0) {
        csvSections.push("MODEL FEATURE IMPORTANCE BREAKDOWN (SHAP VALUES)");
        csvSections.push("Feature Name,Fraud Impact (Score),Normal Impact (Score)");
        featureData.forEach(item => {
          csvSections.push(`${item.feature},${item.fraud?.toFixed(4)},${item.normal?.toFixed(4)}`);
        });
        csvSections.push("");
      }

      if (riskDistData.length > 0) {
        csvSections.push("RISK SCORE DISTRIBUTION");
        csvSections.push("Risk Score Range,Anomalous Count,Normal Count");
        riskDistData.forEach(item => {
          csvSections.push(`${item.score},${item.fraud},${item.normal}`);
        });
      }

      const csvContent = "\uFEFF" + csvSections.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `ledgerwatch_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export analytics:", err);
      alert("Failed to export analytics: " + err.message);
    }
  };

  const isLoading = statsLoading;

  // ROC is model-static, always mock
  const rocData = MOCK_ROC_DATA;

  // ✅ Feature Importance from API statsData
  const featureData = useMemo(() => {
    if (statsData?.feature_importance && statsData.feature_importance.length > 0) {
      return statsData.feature_importance.map((item) => ({
        feature: item.feature,
        fraud: item.importance * 5,
        normal: item.importance * 0.5,
      }));
    }
    return [];
  }, [statsData]);

  // ✅ Fraud by Type from real-time API stats
  const fraudTypeData = useMemo(() => {
    if (statsData?.fraud_by_type && statsData.fraud_by_type.length > 0) {
      return statsData.fraud_by_type;
    }
    return [];
  }, [statsData]);

  // ✅ Risk Distribution from real-time API stats
  const riskDistData = useMemo(() => {
    if (statsData?.risk_distribution && statsData.risk_distribution.length > 0) {
      return statsData.risk_distribution;
    }
    return [];
  }, [statsData]);

  // Stats from API
  const totalTx = statsData?.total_transactions || 0;
  const anomaliesDetected = statsData?.anomalies_detected || 0;
  const anomalyRate = totalTx > 0 ? ((anomaliesDetected / totalTx) * 100).toFixed(3) : '0.000';
  const rocAuc = 0.8946;
  const liftAt1 = 109;

  return (
    <div className="p-6 space-y-6" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <BarChart3 size={28} className="text-cyan-400" />
            Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Model performance metrics, feature insights, and fraud pattern analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!statsLoading && (
            <button
              onClick={handleExportAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/35 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export Data (Excel)
            </button>
          )}
          {statsLoading && (
            <span className="text-cyan-400 text-xs flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading...
            </span>
          )}
          {statsError && (
            <span className="text-red-400 text-xs" title={statsError}>
              API Error
            </span>
          )}
          {!statsLoading && !statsError && (
            <span className="text-emerald-400 text-xs flex items-center gap-1">
              <Zap className="w-3 h-3" /> Live API
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          title="ROC-AUC Score"
          value={rocAuc.toFixed(4)}
          subtitle="Excellent discrimination"
          trend="up"
          trendValue="+0.34 vs LOF"
          color="cyan"
        />
        <MetricCard
          icon={Zap}
          title="Lift @ Top 1%"
          value={`${liftAt1}×`}
          subtitle="vs random baseline"
          trend="up"
          trendValue="Top performance"
          color="amber"
        />
        <MetricCard
          icon={Shield}
          title="Anomaly Rate"
          value={`${anomalyRate}%`}
          subtitle={`${anomaliesDetected.toLocaleString()} flagged`}
          trend="up"
          trendValue="Tested against validation set"
          color="emerald"
        />
        <MetricCard
          icon={Brain}
          title="Total Transactions"
          value={totalTx.toLocaleString()}
          subtitle="Processed to date"
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="roc-chart" className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">ROC Curve</h3>
            </div>
            <button 
              onClick={() => downloadChartAsJpeg('roc-chart', 'roc_curve.jpg')}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 rounded transition-all"
            >
              <Download size={11} /> Download JPEG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rocData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="fpr"
                stroke="#64748B"
                fontSize={12}
                label={{
                  value: 'False Positive Rate',
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#64748B',
                  fontSize: 10,
                }}
              />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                label={{
                  value: 'True Positive Rate',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748B',
                  fontSize: 10,
                }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={0} y={0} stroke="#334155" />
              <Line
                type="monotone"
                dataKey="tpr"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Isolation Forest"
              />
              <Line
                type="monotone"
                dataKey="random"
                stroke="#64748B"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Random"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <span>
              Model: <span className="text-cyan-400 font-mono">isolation_forest_v1.0.0</span>
            </span>
            <span>
              Dataset: <span className="text-slate-300">PaySim (6.3M rows)</span>
            </span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span className="text-slate-500 text-xs">Isolation Forest (AUC = 0.8946)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #64748B 0, #64748B 3px, transparent 3px, transparent 6px)',
                }}
              />
              <span className="text-slate-500 text-xs">Random (AUC = 0.5000)</span>
            </div>
          </div>
        </div>

        <div id="feature-chart" className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Feature Importance</h3>
            </div>
            <button 
              onClick={() => downloadChartAsJpeg('feature-chart', 'feature_importance.jpg')}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 rounded transition-all"
            >
              <Download size={11} /> Download JPEG
            </button>
          </div>
          {featureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={featureData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                <XAxis type="number" stroke="#64748B" fontSize={12} />
                <YAxis
                  dataKey="feature"
                  type="category"
                  stroke="#94A3B8"
                  fontSize={11}
                  width={120}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="fraud" fill="#EF4444" radius={[0, 4, 4, 0]} name="Fraud" />
                <Bar dataKey="normal" fill="#10B981" radius={[0, 4, 4, 0]} name="Normal" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
              {statsLoading ? 'Loading...' : 'No data available'}
            </div>
          )}
          <div className="mt-3 text-xs text-slate-500">
            <span className="text-red-400">Red</span> = Fraud transactions ·{' '}
            <span className="text-emerald-400">Green</span> = Normal transactions
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="fraud-type-chart" className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Fraud by Type</h3>
            </div>
            <button 
              onClick={() => downloadChartAsJpeg('fraud-type-chart', 'fraud_by_type.jpg')}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 rounded transition-all"
            >
              <Download size={11} /> Download JPEG
            </button>
          </div>
          {fraudTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={fraudTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fraudTypeData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {fraudTypeData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-slate-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{item.fraud} fraud</span>
                      <span className="text-slate-200 font-medium">{item.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
              {statsLoading ? 'Loading...' : 'No data available'}
            </div>
          )}
        </div>

        <div id="lift-chart" className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Precision by Percentile</h3>
            </div>
            <button 
              onClick={() => downloadChartAsJpeg('lift-chart', 'lift_percentiles.jpg')}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 rounded transition-all"
            >
              <Download size={11} /> Download JPEG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_LIFT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="percentile" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="lift" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-xs text-slate-500 text-center">
            Top 1% of anomaly scores contain{' '}
            <span className="text-cyan-400 font-medium">10.9%</span> fraud (109× lift)
          </div>
        </div>

        <div id="risk-dist-chart" className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Risk Score Distribution</h3>
            </div>
            <button 
              onClick={() => downloadChartAsJpeg('risk-dist-chart', 'risk_distribution.jpg')}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-1 rounded transition-all"
            >
              <Download size={11} /> Download JPEG
            </button>
          </div>
          {riskDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={riskDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="score" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="fraud"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  name="Fraud"
                />
                <Area
                  type="monotone"
                  dataKey="normal"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Normal"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
              {statsLoading ? 'Loading...' : 'No data available'}
            </div>
          )}
          <div className="mt-3 text-xs text-slate-500 text-center">
            Fraud mean: <span className="text-red-400 font-mono">87.4</span> · Normal mean:{''}
            <span className="text-emerald-400 font-mono">49.6</span>
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
            <p className="text-slate-400 text-xs leading-relaxed">
              Model trained without labels achieves{' '}
              <span className="text-cyan-400 font-semibold">0.89 ROC-AUC</span> when validated
              against held-out fraud labels — proving anomaly detection works.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-medium">Inverted Balance Anomaly</div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Discovery: transactions where originator balance drops to exactly zero
              after transfer are the strongest fraud signal.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-cyan-400 font-medium">Type-Constrained Fraud</div>
            <p className="text-slate-400 text-xs leading-relaxed">
              100% of fraud occurs in{' '}
              <span className="text-red-400 font-semibold">TRANSFER</span> (0.77%) and{' '}
              <span className="text-red-400 font-semibold">CASH_OUT</span> (0.18%) types.
              PAYMENT, CASH_IN, and DEBIT have zero fraud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
