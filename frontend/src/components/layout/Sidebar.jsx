import {
    BarChart3,
    Brain,
    LayoutDashboard,
    List,
    Settings,
    Upload,
    Zap
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [

    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/transactions', label: 'Transactions', icon: List },
    { path: '/explain', label: 'Explainability', icon: Brain },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-background-secondary border-r border-border-subtle transition-all duration-300 z-50 flex flex-col ${collapsed ? 'w-16' : 'w-60'
                }`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-border-subtle">
                <Zap className="w-7 h-7 text-accent-success flex-shrink-0" />
                {!collapsed && (
                    <div className="ml-3 overflow-hidden">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-accent-success to-accent-info bg-clip-text text-transparent whitespace-nowrap">
                            LedgerWatch
                        </h1>
                        <p className="text-[10px] text-text-muted -mt-1 tracking-wider">AI</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-background-tertiary border-l-[3px] border-accent-info text-accent-info'
                                : 'text-text-secondary hover:bg-background-tertiary/50 hover:text-text-primary border-l-[3px] border-transparent'
                                }`}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent-info' : 'text-text-secondary group-hover:text-text-primary'}`} />
                            {!collapsed && <span className="ml-3 text-sm font-medium whitespace-nowrap">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Status */}
            <div className="p-3 border-t border-border-subtle">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-2'}`}>
                    <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                    {!collapsed && (
                        <div className="ml-2 text-xs">
                            <p className="text-text-secondary">API Online</p>
                            <p className="text-text-muted">v1.0.0</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
