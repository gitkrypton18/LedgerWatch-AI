import { Activity, AlertTriangle, DollarSign, Shield, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const trendData = [
    { time: "00:00", anomalies: 12, normal: 450 },
    { time: "04:00", anomalies: 8, normal: 380 },
    { time: "08:00", anomalies: 25, normal: 620 },
    { time: "12:00", anomalies: 45, normal: 890 },
    { time: "16:00", anomalies: 38, normal: 750 },
    { time: "20:00", anomalies: 22, normal: 520 },
    { time: "23:59", anomalies: 15, normal: 410 },
];

const riskDistribution = [
    { name: "Low (0-30)", value: 5840, color: "#10B981" },
    { name: "Medium (31-70)", value: 320, color: "#F59E0B" },
    { name: "High (71-90)", value: 180, color: "#EF4444" },
    { name: "Critical (91-100)", value: 45, color: "#DC2626" },
];

const kpiData = [
    { title: "Total Transactions", value: "6,362,620", change: "+12%", trend: "up", icon: Activity, color: "text-accent-info", bgColor: "bg-accent-info/10" },
    { title: "Anomalies Detected", value: "8,213", change: "0.129%", trend: "down", icon: AlertTriangle, color: "text-accent-warning", bgColor: "bg-accent-warning/10" },
    { title: "Avg Risk Score", value: "49.6", change: "─", trend: "neutral", icon: Shield, color: "text-accent-success", bgColor: "bg-accent-success/10" },
    { title: "Fraud Amount", value: "$1.2M", change: "+5%", trend: "up", icon: DollarSign, color: "text-accent-danger", bgColor: "bg-accent-danger/10" },
];

function KpiCard({ title, value, change, trend, icon: Icon, color, bgColor }) {
    return (
        <div className="bg-background-secondary border border-border-subtle rounded-xl p-5 card-hover">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-text-secondary mb-1">{title}</p>
                    <h3 className="text-2xl font-mono font-semibold text-text-primary">{value}</h3>
                    <div className="flex items-center gap-1 mt-2">
                        {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-accent-success" />}
                        {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-accent-danger" />}
                        {trend === "neutral" && <span className="w-3.5 h-3.5" />}
                        <span className={`text-xs font-medium ${trend === "up" ? "text-accent-success" : trend === "down" ? "text-accent-danger" : "text-text-muted"}`}>{change}</span>
                    </div>
                </div>
                <div className={`p-2.5 rounded-lg ${bgColor}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            </div>
        </div>
    );
}

function RiskRing({ score = 87 }) {
    const radius = 50;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = () => {
        if (score <= 30) return "#10B981";
        if (score <= 70) return "#F59E0B";
        if (score <= 90) return "#EF4444";
        return "#EF4444";
    };

    const getGlowClass = () => {
        if (score <= 30) return "risk-glow-low";
        if (score <= 70) return "risk-glow-medium";
        if (score <= 90) return "risk-glow-high";
        return "risk-glow-critical";
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative rounded-full p-1 ${getGlowClass()}`}>
                <svg width={radius * 2} height={radius * 2} className="transform -rotate-90">
                    <circle stroke="#1E293B" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
                    <circle stroke={getColor()} fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset, transition: "stroke-dashoffset 1.5s ease-out" }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-mono font-bold text-text-primary">{score}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">Risk</span>
                </div>
            </div>
            <span className={`mt-3 px-3 py-1 rounded-md text-xs font-medium uppercase ${score <= 30 ? "bg-accent-success/15 text-accent-success border border-accent-success/30" :
                    score <= 70 ? "bg-accent-warning/15 text-accent-warning border border-accent-warning/30" :
                        score <= 90 ? "bg-accent-danger/15 text-accent-danger border border-accent-danger/30" :
                            "bg-accent-danger/25 text-accent-danger border border-accent-danger/50 animate-pulse"
                }`}>
                {score <= 30 ? "Low" : score <= 70 ? "Medium" : score <= 90 ? "High" : "Critical"}
            </span>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel rounded-lg p-3 shadow-xl">
                <p className="text-text-secondary text-sm mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiData.map((kpi, index) => (<KpiCard key={index} {...kpi} />))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-background-secondary border border-border-subtle rounded-xl p-5">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-text-primary">Anomaly Detection Trend</h3>
                            <p className="text-sm text-text-muted mt-0.5">Real-time fraud pattern analysis</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <span className="w-2 h-2 rounded-full bg-accent-danger" />Anomalies
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                                <span className="w-2 h-2 rounded-full bg-accent-info" />Normal
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
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
                            <XAxis dataKey="time" stroke="#64748B" fontSize={12} tickLine={false} />
                            <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="anomalies" stroke="#EF4444" strokeWidth={2} fill="url(#anomalyGradient)" />
                            <Area type="monotone" dataKey="normal" stroke="#3B82F6" strokeWidth={2} fill="url(#normalGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-6">
                    <div className="bg-background-secondary border border-border-subtle rounded-xl p-5 flex flex-col items-center">
                        <h3 className="text-base font-semibold text-text-primary mb-4 self-start">Current Risk Level</h3>
                        <RiskRing score={87} />
                    </div>
                    <div className="bg-background-secondary border border-border-subtle rounded-xl p-5">
                        <h3 className="text-base font-semibold text-text-primary mb-4">Risk Distribution</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                    {riskDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {riskDistribution.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-xs text-text-secondary">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-background-secondary border border-border-subtle rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border-subtle flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-text-primary">Recent High-Risk Transactions</h3>
                        <p className="text-sm text-text-muted mt-0.5">Flagged for manual review</p>
                    </div>
                    <button className="text-sm text-accent-info hover:text-blue-400 transition-colors">View All →</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-background-tertiary/50">
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">ID</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Amount</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Risk Score</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {[
                                { id: "#001", type: "TRANSFER", amount: "$150,000", score: 99, status: "Critical", time: "2 min ago" },
                                { id: "#002", type: "CASH_OUT", amount: "$92,000", score: 87, status: "High", time: "5 min ago" },
                                { id: "#003", type: "TRANSFER", amount: "$45,000", score: 94, status: "Critical", time: "12 min ago" },
                                { id: "#004", type: "PAYMENT", amount: "$250,000", score: 76, status: "High", time: "18 min ago" },
                                { id: "#005", type: "CASH_OUT", amount: "$67,500", score: 82, status: "High", time: "24 min ago" }
                            ].map((tx, i) => (
                                <tr key={i} className="hover:bg-background-tertiary/30 transition-colors group cursor-pointer">
                                    <td className="px-5 py-3.5"><span className="text-sm font-mono text-text-primary">{tx.id}</span></td>
                                    <td className="px-5 py-3.5"><span className="text-sm text-text-secondary">{tx.type}</span></td>
                                    <td className="px-5 py-3.5"><span className="text-sm font-mono text-text-primary">{tx.amount}</span></td>
                                    <td className="px-5 py-3.5">
                                        <span className={`text-sm font-mono font-semibold ${tx.score >= 90 ? "text-accent-danger" : tx.score >= 70 ? "text-accent-warning" : "text-accent-success"}`}>{tx.score}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium uppercase ${tx.status === "Critical" ? "bg-accent-danger/15 text-accent-danger border border-accent-danger/30" : tx.status === "High" ? "bg-accent-warning/15 text-accent-warning border border-accent-warning/30" : "bg-accent-success/15 text-accent-success border border-accent-success/30"}`}>{tx.status}</span>
                                    </td>
                                    <td className="px-5 py-3.5"><span className="text-sm text-text-muted">{tx.time}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
