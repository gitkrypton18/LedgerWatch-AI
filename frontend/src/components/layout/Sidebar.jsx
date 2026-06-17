import {
    BarChart3,
    Brain,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    List,
    Menu,
    Settings,
    Upload,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/transactions', icon: List, label: 'Transactions' },
    { path: '/explain', icon: Brain, label: 'Explainability' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle, isMobile }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ─── MOBILE TOP NAV BAR ─────────────────────────────
    if (isMobile) {
        return (
            <>
                <div className="sidebar-mobile fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-3 bg-background-secondary/95 backdrop-blur-xl border-b border-border-subtle">
                    {/* Logo */}
                    <div className="mobile-logo flex items-center gap-2">
                        <div className="mobile-logo-icon w-7 h-7 rounded-lg bg-accent-info/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-accent-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        </div>
                        <span className="mobile-logo-text text-sm font-bold text-text-primary">LedgerWatch</span>
                    </div>

                    {/* Horizontal Scroll Nav */}
                    <nav className="mobile-nav-scroll flex items-center gap-1 overflow-x-auto scrollbar-hide ml-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `mobile-nav-item flex items-center justify-center p-2 rounded-md transition-colors ${isActive
                                        ? 'bg-accent-info/10 text-accent-info'
                                        : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                                    }`
                                }
                            >
                                <item.icon className="w-[18px] h-[18px]" />
                            </NavLink>
                        ))}
                    </nav>

                    {/* Hamburger Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="mobile-menu-btn w-8 h-8 rounded-md bg-background-tertiary/50 flex items-center justify-center text-text-secondary ml-1"
                    >
                        {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="mobile-dropdown fixed top-14 left-0 right-0 z-40 bg-background-secondary/98 backdrop-blur-xl border-b border-border-subtle p-3 space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `mobile-dropdown-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                        ? 'bg-accent-info/10 text-accent-info'
                                        : 'text-text-secondary hover:bg-background-tertiary'
                                    }`
                                }
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                        <div className="border-t border-border-subtle pt-2 mt-2">
                            <div className="flex items-center gap-2 px-3 py-2">
                                <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                                <span className="text-xs text-accent-success">API Online v1.0.0</span>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ─── DESKTOP SIDEBAR ────────────────────────────────
    return (
        <div className="h-full flex flex-col bg-background-secondary border-r border-border-subtle">
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
                    className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
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
