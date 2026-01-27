import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SettingsPage from './components/SettingsPage';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import InboxPage from './components/InboxPage';
import { API_URL } from './config';

function App() {
    const [activePage, setActivePage] = useState(() => localStorage.getItem('app_activePage') || 'dashboard');

    // Shared Data State
    const [stats, setStats] = useState({});
    const [pending, setPending] = useState([]);

    // Audio Ref
    const audioRef = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

    // Polling Data (Background for Audio Notifications)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`${API_URL}/api/dashboard/stats`);
                setStats(await statsRes.json());
                // Fetch Inbox
                const inboxRes = await fetch(`${API_URL}/api/dashboard/inbox`);
                const newInbox = await inboxRes.json();

                // Play Sound if new Action Required
                const prevActionCount = pending.filter(p => p.actionRequired).length;
                const newActionCount = newInbox.filter(p => p.actionRequired).length;
                if (newActionCount > prevActionCount) {
                    audioRef.current.play().catch(e => console.log("Audio play failed"));
                }

                setPending(newInbox);
            } catch (e) {
                console.error("API Error", e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, [pending.length]); // Simple dependency on length to avoid loops, or refine

    useEffect(() => { localStorage.setItem('app_activePage', activePage); }, [activePage]);

    return (
        <div className="flex h-screen w-full bg-[var(--bg-deep)] text-[var(--text-primary)] font-sans overflow-hidden">
            {/* Sidebar Navigation */}
            <Sidebar activePage={activePage} setActivePage={setActivePage} />

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative bg-[var(--bg-main)]">
                {activePage === 'dashboard' && <ExecutiveDashboard />}
                {activePage === 'inbox' && <InboxPage />}
                {activePage === 'settings' && (
                    <div className="p-8 w-full max-w-4xl mx-auto overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-serif text-[var(--gold)]">Settings</h2>
                        </div>
                        <SettingsPage />
                    </div>
                )}
                {activePage === 'rates' && (
                    <div className="p-8 flex items-center justify-center h-full text-gray-500">
                        Live Rates Module (Coming Soon)
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
