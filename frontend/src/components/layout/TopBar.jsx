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
    // ✅ NUCLEAR FIX: Read from URL every render + force update
    const [pathname, setPathname] = useState(() => window.location.pathname);
    const [tick, setTick] = useState(0); // Force re-render trigger
    const intervalRef = useRef(null);

    // ✅ METHOD 1: popstate (browser back/forward)
    useEffect(() => {
        const handlePopState = () => {
            const current = window.location.pathname;
            console.log('[TopBar] popstate:', current);
            setPathname(current);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // ✅ METHOD 2: hashchange (fallback)
    useEffect(() => {
        const handleHashChange = () => {
            const current = window.location.pathname;
            console.log('[TopBar] hashchange:', current);
            setPathname(current);
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // ✅ METHOD 3: click on sidebar links (React Router navigation)
    useEffect(() => {
        const handleClick = (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.includes(window.location.origin)) {
                setTimeout(() => {
                    const current = window.location.pathname;
                    console.log('[TopBar] link click:', current);
                    setPathname(current);
                }, 50);
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // ✅ METHOD 4: MutationObserver (DOM changes)
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const current = window.location.pathname;
            setPathname(prev => {
                if (prev !== current) {
                    console.log('[TopBar] mutation:', prev, '→', current);
                    return current;
                }
                return prev;
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    // ✅ METHOD 5: Periodic polling (100ms)
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            const current = window.location.pathname;
            setPathname(prev => {
                if (prev !== current) {
                    console.log('[TopBar] poll:', prev, '→', current);
                    return current;
                }
                return prev;
            });
        }, 100);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    // ✅ METHOD 6: Force re-render every second (nuclear option)
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // ✅ Get title based on current pathname
    const currentRoute = routeTitles[pathname] || { title: 'LedgerWatch', subtitle: 'AI' };

    // ✅ DEBUG: Log every render
    console.log(`[TopBar] render: pathname=${pathname}, title=${currentRoute.title}, tick=${tick}`);

    return (
        <header
            className={`h-16 bg-background-secondary/80 backdrop-blur-xl border-b border-border-subtle fixed top-0 right-0 z-40 flex items-center justify-between px-6 transition-all duration-300 ${sidebarCollapsed ? 'left-16' : 'left-60'}`}
        >
            <div className="flex items-center gap-4">
                {/* ✅ Title with debug info */}
                <h2 className="text-lg font-semibold text-text-primary">
                    {currentRoute.title}
                </h2>
                <span className="text-text-muted">/</span>
                <span className="text-sm text-text-secondary">{currentRoute.subtitle}</span>

                {/* ✅ DEBUG: Show pathname (remove after fix) */}
                <span className="text-[10px] text-text-muted font-mono ml-2 opacity-50">
                    [{pathname}]
                </span>
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
