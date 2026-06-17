import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-collapse sidebar on tablet
    useEffect(() => {
        const checkTablet = () => {
            const width = window.innerWidth;
            if (width >= 768 && width < 1024) {
                setSidebarCollapsed(true);
            } else if (width >= 1024) {
                setSidebarCollapsed(false);
            }
        };

        checkTablet();
        window.addEventListener('resize', checkTablet);
        return () => window.removeEventListener('resize', checkTablet);
    }, []);

    return (
        <div className="layout-wrapper min-h-screen bg-background-primary flex">
            {/*
              SIDEBAR
              Desktop: Flex item with width transition
              Mobile: Hidden (replaced by top nav in Sidebar component)
            */}
            <aside
                className={`sidebar-desktop h-screen flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'} hidden md:block`}
            >
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    isMobile={isMobile}
                />
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="main-content-area flex-1 flex flex-col min-h-screen w-full">
                <TopBar isMobile={isMobile} />
                <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
