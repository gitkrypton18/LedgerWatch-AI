import {
    BarChart3,
    Brain,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    List,
    Settings,
    Upload,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/transactions', icon: List, label: 'Transactions' },
    { path: '/explain', icon: Brain, label: 'Explainability' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle }) {
    return (
        <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-accent-info/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-lg font-bold text-text-primary leading-tight">LedgerWatch</h1>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">AI</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={onToggle}
                    className="hidden lg:flex p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 text-text-muted" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-accent-info/10 text-accent-info border border-accent-info/20'
                                : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                            } ${collapsed ? 'justify-center' : ''}`
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Status */}
            <div className="p-4 border-t border-border-subtle">
                <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                    <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                    {!collapsed && (
                        <div>
                            <p className="text-xs text-accent-success font-medium">API Online</p>
                            <p className="text-[10px] text-text-muted">v1.0.0</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
