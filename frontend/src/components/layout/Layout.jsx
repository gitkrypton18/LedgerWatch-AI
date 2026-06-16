import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-background-primary">
            {/* Mobile Hamburger */}
            <button
                className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-background-secondary rounded-xl border border-border-subtle shadow-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-text-primary" />
                ) : (
                    <Menu className="w-5 h-5 text-text-primary" />
                )}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-background-secondary border-r border-border-subtle
                transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:h-screen
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                ${sidebarCollapsed ? 'w-16' : 'w-60'}
            `}>
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </aside>

            {/* Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className={`
                flex flex-col min-h-screen
                ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}
            `}>
                <TopBar sidebarCollapsed={sidebarCollapsed} />

                {/* ✅ FIX: pt-16 hatao, h-full add karo */}
                <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
