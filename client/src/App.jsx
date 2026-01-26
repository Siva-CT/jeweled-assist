import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import ChatArea from './components/ChatArea';
import SettingsPage from './components/SettingsPage';
import { API_URL } from './config';

function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [stats, setStats] = useState({ qualifiedleads: 0 });
    const [pending, setPending] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`${API_URL}/api/dashboard/stats`);
                setStats(await statsRes.json());
                const pendingRes = await fetch(`${API_URL}/api/dashboard/pending`);
                setPending(await pendingRes.json());
            } catch (e) {
                console.error("API Error", e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id, finalPrice) => {
        await fetch(`${API_URL}/api/dashboard/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, finalPrice })
        });
        setPending(pending.filter(p => p.id !== id));
        setSelectedId(null);
    };

    const selectedItem = pending.find(p => p.id === selectedId);

    return (
        <div className="flex h-screen bg-black text-white font-sans">
            <Sidebar activePage={activePage} setActivePage={setActivePage} />

            <main className="flex-1 flex overflow-hidden">
                {activePage === 'settings' ? (
                    <div className="flex-1 overflow-y-auto"><SettingsPage /></div>
                ) : (
                    <>
                        {/* Left List */}
                        <div className="w-1/3 border-r border-white/5 p-6 flex flex-col">
                            <DashboardStats stats={stats} />
                            <h3 className="font-bold mb-4 text-gray-400">PENDING APPROVALS</h3>
                            <div className="space-y-3 overflow-y-auto flex-1">
                                {pending.map(item => (
                                    <div key={item.id} onClick={() => setSelectedId(item.id)} className={`p-4 rounded-xl cursor-pointer border ${selectedId === item.id ? 'border-yellow-500 bg-yellow-500/5' : 'border-white/5 bg-[#121212] hover:bg-[#1a1a1a]'}`}>
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-white">{item.customer}</span>
                                            <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">ESTIMATE</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{item.weight}g {item.metal || 'Gold'} • ₹{item.estimatedCost}</p>
                                    </div>
                                ))}
                                {pending.length === 0 && <p className="text-gray-600 text-center mt-10">No pending requests.</p>}
                            </div>
                        </div>

                        {/* Right Chat */}
                        <div className="w-2/3 h-full">
                            <ChatArea selectedItem={selectedItem} onApprove={handleApprove} />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;
