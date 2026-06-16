import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background-primary">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
                <TopBar sidebarCollapsed={sidebarCollapsed} />
                <main className="pt-16 p-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
