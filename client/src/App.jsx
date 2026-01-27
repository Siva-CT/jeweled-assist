import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsPage from './components/SettingsPage';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import { API_URL } from './config';
import { Users, AlertCircle } from 'lucide-react';

function App() {
    const [activePage, setActivePage] = useState(() => localStorage.getItem('app_activePage') || 'dashboard'); // 'dashboard', 'inbox', 'settings', 'customers'

    // Shared Data State
    const [stats, setStats] = useState({});
    const [pending, setPending] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('app_activeTab') || 'chat'); // For Inbox Side Panel

    useEffect(() => { localStorage.setItem('app_activePage', activePage); }, [activePage]);
    useEffect(() => { localStorage.setItem('app_activeTab', activeTab); }, [activeTab]);

    // Polling Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`${API_URL}/api/dashboard/stats`);
                setStats(await statsRes.json());

                // Fetch Pending/Active Chats
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
        setPending(prev => prev.filter(p => p.id !== id));
        setSelectedId(null);
    };

    const selectedItem = pending.find(p => p.id === selectedId) || null;
    const itemData = (item) => ({ intent: item?.type || 'Unknown' });

    // --- RENDER HELPERS ---

    // The 3-Pane Inbox Layout
    const renderInbox = () => (
        <div className="flex flex-1 overflow-hidden h-full">
            {/* LEFT PANEL (Inbox List) */}
            <div className="w-[20%] min-w-[250px] flex flex-col border-r border-white/5 bg-[var(--bg-panel)]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 h-[65px] flex items-center justify-between">
                    <h2 className="font-bold text-lg">Inbox</h2>
                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400">{pending.length} Active</span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {pending.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 text-sm">No active queries</div>
                    ) : (
                        pending.map(item => (
                            <div
                                key={item.id}
                                onClick={() => { setSelectedId(item.id); }}
                                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedId === item.id
                                    ? 'bg-[var(--gold-glow)] border-[var(--gold-primary)]'
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-medium text-sm ${selectedId === item.id ? 'text-[var(--gold-primary)]' : 'text-gray-200'}`}>
                                        {item.customer}
                                    </span>
                                    {item.status === 'pending_approval' && (
                                        <div className="w-2 h-2 rounded-full bg-[var(--status-pending)] animate-pulse" title="Needs Approval" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">
                                    {item.type === 'estimate' ? `Estimate: ${item.weight}g` : 'General Inquiry'}...
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MIDDLE PANEL (Chat) */}
            <div className="w-[50%] flex flex-col border-r border-white/5 bg-[var(--bg-deep)] relative">
                <ChatArea selectedItem={selectedItem} onApprove={handleApprove} />
            </div>

            {/* RIGHT PANEL (Context) */}
            <div className="w-[30%] min-w-[300px] flex flex-col bg-[var(--bg-panel)]">
                <div className="p-4 border-b border-white/5 h-[65px] flex items-center">
                    <h2 className="font-bold text-lg">Context & Actions</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {selectedItem ? (
                        <div className="space-y-6">
                            <div className="bg-white/5 p-5 rounded-xl border border-white/5 text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-2xl mb-4 mx-auto">
                                    👤
                                </div>
                                <h3 className="text-xl font-bold">{selectedItem.customer}</h3>
                                <p className="text-sm text-gray-400">Recurring Customer</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                <span className="text-sm text-gray-400">Total Spent</span>
                                <span className="text-[var(--gold-primary)] font-bold">₹0.00</span>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 opacity-50">
                                <h4 className="text-sm font-bold text-gray-400 mb-2">Notes</h4>
                                <textarea className="w-full bg-transparent text-sm resize-none outline-none" rows="4" placeholder="Add notes..."></textarea>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600">
                            <Users size={48} className="mb-4 opacity-20" />
                            <p>Select a conversation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full bg-[var(--bg-deep)] text-[var(--text-primary)] font-sans overflow-hidden">
            {/* Sidebar Navigation */}
            <Sidebar activePage={activePage} setActivePage={setActivePage} />

            {/* Main Content Area */}
            <main className="flex-1 flex overflow-hidden relative">
                {activePage === 'dashboard' && <ExecutiveDashboard />}
                {(activePage === 'inbox' || activePage === 'customers') && renderInbox()}
                {activePage === 'settings' && (
                    <div className="p-8 w-full max-w-4xl mx-auto overflow-y-auto custom-scrollbar">
                        <h2 className="text-3xl font-bold mb-8 font-serif text-[var(--gold-primary)]">Settings</h2>
                        <SettingsPage />
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
