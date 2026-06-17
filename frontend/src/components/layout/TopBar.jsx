import { Bell, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
    const intervalRef = useRef(null);

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
                                    className="bg-background-tertiary border border-border-subtle rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-info w-40"
                                    onBlur={() => setSearchOpen(false)}
                                />
                                <button
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                    onClick={() => setSearchOpen(false)}
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
                <button className="action-btn-icon relative p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                    <Bell className="w-5 h-5 text-text-secondary" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-danger rounded-full" />
                </button>

                {/* User Profile */}
                <button className="action-btn-icon flex items-center gap-2 p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-accent-info/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent-info" />
                    </div>
                    <span className="text-sm text-text-secondary hidden md:inline">Admin</span>
                </button>
            </div>
        </header>
    );
}
