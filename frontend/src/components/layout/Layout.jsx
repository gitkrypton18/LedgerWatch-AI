import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    // ✅ Manage sidebar collapsed state here for dynamic layout
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-background-primary">
            {/* ✅ Pass state + setter to Sidebar */}
            <Sidebar 
                collapsed={sidebarCollapsed} 
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
            />
            
            {/* ✅ Dynamic margin based on sidebar state */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
                {/* ✅ Pass sidebarCollapsed to TopBar */}
                <TopBar sidebarCollapsed={sidebarCollapsed} />
                <main className="pt-16 p-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
