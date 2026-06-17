import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(true); // ✅ Default true for safety

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            console.log('Mobile check:', mobile, 'Width:', window.innerWidth); // Debug
            setIsMobile(mobile);
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
        <div className="min-h-screen bg-background-primary flex flex-col md:flex-row">
            {/* ✅ MOBILE: Always render Sidebar, it handles mobile internally */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-[100]">
                <Sidebar
                    isMobile={true}
                    collapsed={false}
                    onToggle={() => { }}
                />
            </div>

            {/* DESKTOP: Sidebar */}
            <div className={`hidden md:block h-screen flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    isMobile={false}
                />
            </div>

            {/* Main Content - Add margin-top for mobile */}
            <div className="flex-1 flex flex-col min-h-screen w-full mt-14 md:mt-0">
                <TopBar isMobile={isMobile} />
                <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
