import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    return (
        <div className="min-h-screen bg-background-primary">
            <Sidebar />
            <div className="ml-60">
                <TopBar />
                <main className="pt-16 p-6 min-h-screen">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
