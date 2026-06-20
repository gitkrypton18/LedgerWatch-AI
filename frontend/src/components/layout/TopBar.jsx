import { Bell, Search, User, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';

const routeTitles = {
    '/': { title: 'Dashboard', subtitle: 'Overview' },
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview' },
    '/upload': { title: 'Upload', subtitle: 'Batch Prediction' },
    '/transactions': { title: 'Transactions', subtitle: 'History & Analysis' },
    '/explain': { title: 'Explainability', subtitle: 'SHAP & Model Insights' },
    '/analytics': { title: 'Analytics', subtitle: 'Performance Metrics' },
    '/settings': { title: 'Settings', subtitle: 'Configuration' },
};

export default function TopBar({ isMobile }) {
    const [pathname, setPathname] = useState(() => window.location.pathname);
    const [searchOpen, setSearchOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const intervalRef = useRef(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const notificationRef = useRef(null);

    useEffect(() => {
        setSearchVal(searchParams.get('search') || '');
    }, [searchParams]);

    const fetchNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const response = await api.get('/transactions', {
                params: { limit: 5, is_anomaly: true }
            });
            setNotifications(response.data?.transactions || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const t = setInterval(fetchNotifications, 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchSubmit = (val) => {
        navigate(`/transactions?search=${encodeURIComponent(val)}`);
    };

    useEffect(() => {
        const handlePopState = () => setPathname(window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            const link = e.target.closest('a');
            if (link?.href?.includes(window.location.origin)) {
                setTimeout(() => setPathname(window.location.pathname), 50);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const current = window.location.pathname;
            setPathname(prev => prev !== current ? current : prev);
        }, 100);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const currentRoute = routeTitles[pathname] || { title: 'LedgerWatch', subtitle: 'AI' };

    return (
        <header className="topbar-desktop h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            {/* Left: Title */}
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <h2 className="page-title text-base md:text-lg font-semibold text-text-primary truncate">
                    {currentRoute.title}
                </h2>
                <span className="breadcrumb-text text-text-muted hidden sm:inline">/</span>
                <span className="breadcrumb-text text-sm text-text-secondary hidden sm:inline truncate">
                    {currentRoute.subtitle}
                </span>
            </div>

            {/* Right: Actions */}
            <div className="topbar-actions flex items-center gap-2 md:gap-4 flex-shrink-0">

                {/* Search - Desktop always, Mobile toggle */}
                {!isMobile ? (
                    /* Desktop Search */
                    <div className="search-bar relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchSubmit(searchVal);
                                }
                            }}
                            className="bg-background-tertiary border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info/20 w-64 transition-all"
                        />
                    </div>
                ) : (
                    /* Mobile Search Toggle */
                    <div className="relative">
                        {searchOpen ? (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    autoFocus
                                    value={searchVal}
                                    onChange={(e) => setSearchVal(e.target.value)}
                                    className="bg-background-tertiary border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-info w-40"
                                    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearchSubmit(searchVal);
                                            setSearchOpen(false);
                                        }
                                    }}
                                />
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                    onClick={() => {
                                        handleSearchSubmit(searchVal);
                                        setSearchOpen(false);
                                    }}
                                >
                                    <Search className="w-4 h-4 text-text-muted" />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="action-btn-icon p-2 rounded-lg hover:bg-background-tertiary transition-colors"
                                onClick={() => setSearchOpen(true)}
                            >
                                <Search className="w-5 h-5 text-text-secondary" />
                            </button>
                        )}
                    </div>
                )}

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => {
                            setNotificationsOpen(!notificationsOpen);
                            if (!notificationsOpen) {
                                fetchNotifications();
                            }
                        }}
                        className="action-btn-icon relative p-2 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer"
                    >
                        <Bell className="w-5 h-5 text-text-secondary" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-danger rounded-full animate-pulse" />
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#111827]/60">
                                <span className="text-xs font-bold text-slate-200">Flagged Anomalies</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                                    {notifications.length} alerts
                                </span>
                            </div>

                            {/* List */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar animate-fade-in">
                                {loadingNotifications && notifications.length === 0 ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-500">
                                        No flagged anomalies found.
                                    </div>
                                ) : (
                                    notifications.map((tx) => (
                                        <a 
                                            key={tx.id} 
                                            href={`/explain?id=${tx.id}`}
                                            className="block p-3.5 hover:bg-[#1a2332] transition-colors border-b border-slate-800/40"
                                            onClick={() => setNotificationsOpen(false)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] font-mono text-slate-400">#{tx.id}</span>
                                                <span className="text-xs font-bold font-mono text-red-400">${tx.amount?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500 uppercase">{tx.type}</span>
                                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-400 font-semibold">
                                                    Risk: {tx.risk_score}
                                                </span>
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-2 border-t border-slate-800 bg-[#111827]/40 text-center">
                                <a 
                                    href="/transactions?status=anomaly" 
                                    className="block py-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                                    onClick={() => setNotificationsOpen(false)}
                                >
                                    View All Anomalies
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile */}
                <div className="relative">
                    <button 
                        className="action-btn-icon flex items-center gap-2 p-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
                        onClick={() => setProfileOpen(!profileOpen)}
                    >
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent-info/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-info" />
                        </div>
                        <span className="text-sm text-text-secondary hidden md:inline">User</span>
                    </button>
                    
                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2">
                            <a href="/settings" className="block px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-[#1a2332] transition-colors">
                                Change Password
                            </a>
                            <div className="h-px bg-slate-800 my-1"></div>
                            <button 
                                onClick={async () => {
                                    try {
                                        await api.delete('/transactions/clear');
                                    } catch (err) {
                                        console.error('Failed to clear database on logout:', err);
                                    }
                                    localStorage.removeItem('ledgerwatch_token');
                                    window.location.href = '/login';
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
