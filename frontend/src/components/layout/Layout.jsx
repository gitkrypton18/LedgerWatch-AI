import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    // ✅ FIX: Manage sidebar collapsed state here for dynamic layout
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background-primary">
            {/* ✅ FIX: Pass state + setter to Sidebar */}
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            
            {/* ✅ FIX: Dynamic margin based on sidebar state */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
                <TopBar />
                <main className="pt-16 p-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
