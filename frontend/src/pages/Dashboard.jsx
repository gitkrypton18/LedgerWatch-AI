import {
    Activity,
    AlertTriangle,
    Database,
    Shield,
    TrendingDown,
    TrendingUp,
    Wifi,
    WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useHealth, useStats, useTransactions } from "../hooks/useApi";

const MOCK_KPI = [
    { title: "Total Transactions", value: "5.0K", change: "+0%", trend: "neutral", icon: Database, color: "text-accent-info", bgColor: "bg-accent-info/10" },
    { title: "Anomalies Detected", value: "703", change: "+14.060%", trend: "up", icon: AlertTriangle, color: "text-accent-warning", bgColor: "bg-accent-warning/10" },
    { title: "Avg Risk Score", value: "51.8", change: "─", trend: "neutral", icon: Shield, color: "text-accent-success", bgColor: "bg-accent-success/10" },
    { title: "Critical Alerts", value: "206", change: "+0%", trend: "up", icon: Activity, color: "text-accent-danger", bgColor: "bg-accent-danger/10" },
];

const MOCK_TREND = [
    { time: "00:00", anomalies: 12, normal: 450 },
    { time: "04:00", anomalies: 8, normal: 380 },
    { time: "08:00", anomalies: 25, normal: 620 },
    { time: "12:00", anomalies: 45, normal: 890 },
    { time: "16:00", anomalies: 38, normal: 750 },
    { time: "20:00", anomalies: 22, normal: 520 },
    { time: "23:59", anomalies: 15, normal: 410 },
];

const MOCK_RISK_DIST = [
    { name: "Low (0-30)", value: 5840, color: "#10B981" },
    { name: "Medium (31-70)", value: 320, color: "#F59E0B" },
    { name: "High (71-90)", value: 180, color: "#EF4444" },
    { name: "Critical (91-100)", value: 45, color: "#DC2626" },
];

function KpiCard({ title, value, change, trend, icon: Icon, color, bgColor, loading }) {
    return (
        <div className="kpi-card bg-background-secondary border border-border-subtle rounded-xl p-4 lg:p-5 card-hover">
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs lg:text-sm text-text-secondary mb-1 truncate">{title}</p>
                    {loading ? (
                        <div className="w-6 h-6 animate-spin rounded-full border-2 border-accent-info border-t-transparent mt-2" />
                    ) : (
                        <h3 className="kpi-value text-xl lg:text-2xl font-mono font-semibold text-text-primary">{value}</h3>
                    )}
                    <div className="flex items-center gap-1 mt-1 lg:mt-2">
                        {trend === "up" && <TrendingUp className="w-3 h-3 text-accent-success flex-shrink-0" />}
                        {trend === "down" && <TrendingDown className="w-3 h-3 text-accent-danger flex-shrink-0" />}
                        <span className={`text-xs font-medium ${trend === "up" ? "text-accent-success" : trend === "down" ? "text-accent-danger" : "text-text-muted"}`}>
                            {change}
                        </span>
                    </div>
                </div>
                <div className={`kpi-icon-box p-2 lg:p-2.5 rounded-lg ${bgColor} flex-shrink-0 ml-3`}>
                    <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${color}`} />
                </div>
            </div>
        </div>
    );
}

function RiskRing({ score = 52 }) {
    const radius = 50;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = () => {
        if (score <= 30) return "#10B981";
        if (score <= 70) return "#F59E0B";
        if (score <= 90) return "#EF4444";
        return "#DC2626";
    };

    const color = getColor();

    return (
        <div className="flex flex-col items-center">
            <div className="relative rounded-full p-1">
                <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
                    <circle stroke="#1E293B" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
                    <circle stroke={color} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset, transition: "stroke-dashoffset 1.5s ease-out" }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl lg:text-3xl font-mono font-bold text-text-primary">{score}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Risk</span>
                </div>
            </div>
            <span className={`mt-3 px-3 py-1 rounded-md text-xs font-medium uppercase ${score <= 30 ? "bg-accent-success/15 text-accent-success border border-accent-success/30" : score <= 70 ? "bg-accent-warning/15 text-accent-warning border border-accent-warning/30" : score <= 90 ? "bg-accent-danger/15 text-accent-danger border border-accent-danger/30" : "bg-accent-danger/25 text-accent-danger border border-accent-danger/50 animate-pulse"}`}>
                {score <= 30 ? "Low" : score <= 70 ? "Medium" : score <= 90 ? "High" : "Critical"}
            </span>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background-secondary/90 backdrop-blur-xl rounded-lg p-3 border border-border-subtle shadow-xl">
                <p className="text-text-secondary text-sm mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [mounted, setMounted] = useState(false);
    const [useMock, setUseMock] = useState(false);

    const { online, data: healthData } = useHealth(30000);
    const { data: statsData, loading: statsLoading } = useStats();
    const { transactions: recentTx } = useTransactions(5, 0);

    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    const kpiData = useMock ? MOCK_KPI : [
        { title: "Total Transactions", value: statsData?.total_transactions?.toLocaleString() || "5,001", change: "+0%", trend: "neutral", icon: Database, color: "text-accent-info", bgColor: "bg-accent-info/10" },
        { title: "Anomalies Detected", value: statsData?.anomalies_detected?.toLocaleString() || "703", change: `+${((statsData?.anomaly_rate || 0) * 100).toFixed(3)}%`, trend: "up", icon: AlertTriangle, color: "text-accent-warning", bgColor: "bg-accent-warning/10" },
        { title: "Avg Risk Score", value: statsData?.avg_risk_score?.toFixed(1) || "51.8", change: "─", trend: "neutral", icon: Shield, color: "text-accent-success", bgColor: "bg-accent-success/10" },
        { title: "Critical Alerts", value: statsData?.critical_count?.toLocaleString() || "206", change: "+0%", trend: "up", icon: Activity, color: "text-accent-danger", bgColor: "bg-accent-danger/10" },
    ];

    const riskDistribution = useMock ? MOCK_RISK_DIST : [
        { name: "Low (0-30)", value: statsData?.low_count || 0, color: "#10B981" },
        { name: "Medium (31-70)", value: statsData?.medium_count || 0, color: "#F59E0B" },
        { name: "High (71-90)", value: statsData?.high_count || 0, color: "#EF4444" },
        { name: "Critical (91-100)", value: statsData?.critical_count || 0, color: "#DC2626" },
    ];

    const recentTransactions = (recentTx || []).map((tx) => ({
        id: `#${tx.id || tx.transaction_id || "—"}`,
        type: tx.type,
        amount: tx.amount ? `$${tx.amount.toLocaleString()}` : "—",
        score: tx.risk_score || 0,
        status: tx.risk_band || "Low",
        time: tx.created_at ? new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : "—",
    }));

    const trendData = MOCK_TREND;

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl lg:text-2xl font-bold text-text-primary truncate">Dashboard</h1>
                    <p className="text-text-muted text-sm mt-1">Real-time fraud detection overview</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${online ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {online ? "API Online" : "API Offline"}
                        {online && healthData && <span className="text-text-muted ml-1 hidden sm:inline">v{healthData.version}</span>}
                    </div>
                    <button onClick={() => setUseMock(!useMock)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${useMock ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-background-tertiary text-text-muted border-border-subtle hover:text-text-primary"}`}>
                        {useMock ? "Mock" : "Live"}
                    </button>
                </div>
            </div>

            {/* KPI Cards - Responsive Grid */}
            <div className="kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {kpiData.map((kpi, index) => (
                    <KpiCard key={index} {...kpi} loading={!useMock && statsLoading} />
                ))}
            </div>

            {/* Charts Row - Responsive */}
            <div className="chart-grid-2 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Anomaly Trend Chart */}
                <div className="lg:col-span-2 bg-background-secondary border border-border-subtle rounded-xl p-4 lg:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-2">
                        <div className="min-w-0">
                            <h3 className="text-sm lg:text-base font-semibold text-text-primary truncate">Anomaly Detection Trend</h3>
                            <p className="text-xs lg:text-sm text-text-muted mt-0.5">Real-time fraud pattern analysis</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <span className="w-2 h-2 rounded-full bg-accent-danger" />Anomalies
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <span className="w-2 h-2 rounded-full bg-accent-info" />Normal
                            </span>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="normalGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                                <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
                                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="anomalies" stroke="#EF4444" strokeWidth={2} fill="url(#anomalyGradient)" />
                                <Area type="monotone" dataKey="normal" stroke="#3B82F6" strokeWidth={2} fill="url(#normalGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4 lg:space-y-6">
                    {/* Risk Ring */}
                    <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 lg:p-5 flex flex-col items-center">
                        <h3 className="text-sm lg:text-base font-semibold text-text-primary mb-4 self-start">Current Risk Level</h3>
                        <RiskRing score={statsData?.avg_risk_score ? Math.round(statsData.avg_risk_score) : 52} />
                    </div>

                    {/* Risk Distribution */}
                    <div className="bg-background-secondary border border-border-subtle rounded-xl p-4 lg:p-5">
                        <h3 className="text-sm lg:text-base font-semibold text-text-primary mb-4">Risk Distribution</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={4} dataKey="value">
                                        {riskDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {riskDistribution.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-text-secondary truncate">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-background-secondary border border-border-subtle rounded-xl overflow-hidden">
                <div className="p-4 lg:p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-sm lg:text-base font-semibold text-text-primary truncate">Recent High-Risk Transactions</h3>
                        <p className="text-xs lg:text-sm text-text-muted mt-0.5">Flagged for manual review</p>
                    </div>
                    <button className="text-sm text-accent-info hover:text-blue-400 transition-colors flex-shrink-0">View All →</button>
                </div>
                <div className="table-scroll-wrapper overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="bg-background-tertiary/50">
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">ID</th>
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Risk</th>
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 lg:px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {recentTransactions.map((tx, i) => (
                                <tr key={i} className="hover:bg-background-tertiary/30 transition-colors">
                                    <td className="px-4 lg:px-5 py-3">
                                        <span className="text-sm font-mono text-text-primary">{tx.id}</span>
                                    </td>
                                    <td className="px-4 lg:px-5 py-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block ${tx.type === "TRANSFER" ? "bg-purple-500/20 text-purple-400" : tx.type === "CASH_OUT" ? "bg-amber-500/20 text-amber-400" : tx.type === "CASH_IN" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"}`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-4 lg:px-5 py-3 text-sm font-mono text-text-primary whitespace-nowrap">{tx.amount}</td>
                                    <td className="px-4 lg:px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 lg:w-16 h-1.5 rounded-full bg-background-tertiary overflow-hidden flex-shrink-0">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${tx.score}%`, backgroundColor: tx.score >= 90 ? "#EF4444" : tx.score >= 70 ? "#F59E0B" : "#10B981" }} />
                                            </div>
                                            <span className="text-xs font-mono font-semibold flex-shrink-0">{tx.score}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-5 py-3">
                                        <span className={`px-2 py-1 rounded-md text-xs font-medium inline-block ${tx.status === 'Critical' ? 'bg-red-500/15 text-red-400 border border-red-500/30' : tx.status === 'High' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-4 lg:px-5 py-3 text-xs text-text-muted whitespace-nowrap">{tx.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
