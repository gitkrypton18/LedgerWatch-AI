import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background-primary flex">
            {/* Sidebar - NOT fixed, flex item */}
            <aside
                className={`h-screen flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
            >
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                <TopBar />
                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
