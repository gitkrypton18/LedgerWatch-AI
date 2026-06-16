import { Bell, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ─── Route to title mapping ─────────────────────────────────
const routeTitles = {
    '/': { title: 'Dashboard', subtitle: 'Overview' },
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview' },
    '/upload': { title: 'Upload', subtitle: 'Batch Prediction' },
    '/transactions': { title: 'Transactions', subtitle: 'History & Analysis' },
    '/explain': { title: 'Explainability', subtitle: 'SHAP & Model Insights' },
    '/analytics': { title: 'Analytics', subtitle: 'Performance Metrics' },
    '/settings': { title: 'Settings', subtitle: 'Configuration' },
};

export default function TopBar({ sidebarCollapsed }) {
    // ✅ FIX: Track pathname with multiple detection methods
    const [pathname, setPathname] = useState(window.location.pathname);
    const intervalRef = useRef(null);

    useEffect(() => {
        // Method 1: popstate event (browser back/forward)
        const handlePopState = () => {
            setPathname(window.location.pathname);
        };

        // Method 2: MutationObserver (detects DOM changes from React Router)
        const observer = new MutationObserver(() => {
            const currentPath = window.location.pathname;
            setPathname(prev => prev !== currentPath ? currentPath : prev);
        });

        // Method 3: Periodic check as fallback
        intervalRef.current = setInterval(() => {
            const currentPath = window.location.pathname;
            setPathname(prev => prev !== currentPath ? currentPath : prev);
        }, 50);

        window.addEventListener('popstate', handlePopState);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('popstate', handlePopState);
            observer.disconnect();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const currentRoute = routeTitles[pathname] || { title: 'LedgerWatch', subtitle: 'AI' };

    return (
        <header
            className={`h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border-subtle fixed top-0 right-0 z-40 flex items-center justify-between px-6 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-60'}`}
        >
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-text-primary">{currentRoute.title}</h2>
                <span className="text-text-muted">/</span>
                <span className="text-sm text-text-secondary">{currentRoute.subtitle}</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="bg-background-tertiary border border-border-subtle rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-info focus:ring-1 focus:ring-accent-info/20 w-64 transition-all"
                    />
                </div>

                <button className="relative p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                    <Bell className="w-5 h-5 text-text-secondary" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-danger rounded-full" />
                </button>

                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                    <div className="w-8 h-8 rounded-full bg-accent-info/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-accent-info" />
                    </div>
                </button>
            </div>
        </header>
    );
}
