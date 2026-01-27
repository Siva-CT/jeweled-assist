import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar'; // We'll repurpose/rename this later or inline it
import ChatArea from './components/ChatArea';
import SettingsPage from './components/SettingsPage';
import { API_URL } from './config';
import { Users, AlertCircle } from 'lucide-react';

function App() {
    const [stats, setStats] = useState({});
    const [pending, setPending] = useState([]);
    const [messages, setMessages] = useState([]); // All queries
    const [selectedId, setSelectedId] = useState(null);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'settings'

    // Polling Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Stats
                const statsRes = await fetch(`${API_URL}/api/dashboard/stats`);
                const statsData = await statsRes.json();
                setStats(statsData);

                // Fetch Pending (for high priority)
                const pendingRes = await fetch(`${API_URL}/api/dashboard/pending`);
                const pendingData = await pendingRes.json();
                setPending(pendingData);

                // Fetch All "Queries" (Deduplicated list logic would technically be backend, 
                // but we might simulate or fetch a different endpoint if available. 
                // For now, we mix pending + others or assume 'pending' is our main list for v1 fix)
                // TODO: Request backend update for /api/dashboard/queries to get full history list.
                // Using pending for now as the 'active' list to prevent breakage.
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
        // Optimistic update
        setPending(prev => prev.filter(p => p.id !== id));
        setSelectedId(null);
    };

    const selectedItem = pending.find(p => p.id === selectedId) || null;

    return (
        <div className="flex h-screen w-full bg-[var(--bg-deep)] text-[var(--text-primary)] font-sans overflow-hidden">

            {/* --- LEFT PANEL (20%) --- */}
            <div className="w-[20%] min-w-[250px] flex flex-col border-r border-white/5 bg-[var(--bg-panel)]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-primary)] flex items-center justify-center text-black font-bold text-lg">
                        💎
                    </div>
                    <span className="font-bold text-lg tracking-wide">Jeweled<span className="text-[var(--gold-primary)]">Assist</span></span>
                </div>

                {/* Navigation Tabs (Mini) */}
                <div className="flex p-2 gap-1 border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-2 text-sm font-medium rounded ${activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Queries
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex-1 py-2 text-sm font-medium rounded ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Settings
                    </button>
                </div>

                {/* Total Queries List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {/* Stats Summary (Mini) */}
                    <div className="grid grid-cols-2 gap-2 mb-4 p-2">
                        <div className="bg-white/5 p-2 rounded border border-white/5">
                            <div className="text-xs text-gray-500">Waitlist</div>
                            <div className="text-xl font-bold text-[var(--gold-primary)]">{pending.length}</div>
                        </div>
                        <div className="bg-white/5 p-2 rounded border border-white/5">
                            <div className="text-xs text-gray-500">Today</div>
                            <div className="text-xl font-bold text-white">{stats.qualifiedleads || 0}</div>
                        </div>
                    </div>

                    <h3 className="text-xs font-bold text-gray-500 px-2 uppercase tracking-wider mb-2">Active Conversations</h3>
                    {pending.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 text-sm">No active queries</div>
                    ) : (
                        pending.map(item => (
                            <div
                                key={item.id}
                                onClick={() => { setSelectedId(item.id); setActiveTab('chat'); }}
                                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedId === item.id
                                        ? 'bg-[var(--gold-glow)] border-[var(--gold-primary)]'
                                        : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-medium text-sm ${selectedId === item.id ? 'text-[var(--gold-primary)]' : 'text-gray-200'}`}>
                                        {item.customer}
                                    </span>
                                    {/* Status Badge */}
                                    {item.status === 'pending_approval' && (
                                        <div className="w-2 h-2 rounded-full bg-[var(--status-pending)] animate-pulse" title="Needs Approval" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 truncate">
                                    {item.type === 'estimate' ? `Estimate: ${item.weight}g ${item.metal}` : 'General Inquiry'}...
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- MIDDLE PANEL (50%) --- */}
            <div className="w-[50%] flex flex-col border-r border-white/5 bg-[var(--bg-deep)] relative">
                {activeTab === 'settings' ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Select "Queries" to view chat or configure settings on the right.
                    </div>
                ) : (
                    <ChatArea selectedItem={selectedItem} onApprove={handleApprove} />
                )}
            </div>

            {/* --- RIGHT PANEL (30%) --- */}
            <div className="w-[30%] min-w-[300px] flex flex-col bg-[var(--bg-panel)]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 h-[65px] flex items-center">
                    <h2 className="font-bold text-lg">
                        {activeTab === 'settings' ? 'Global Configuration' : 'Context & Actions'}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'settings' ? (
                        <SettingsPage />
                    ) : (
                        // Context View for Chat
                        selectedItem ? (
                            <div className="space-y-6">
                                {/* Customer Card */}
                                <div className="bg-white/5 p-5 rounded-xl border border-white/5">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-2xl mb-4 mx-auto">
                                        👤
                                    </div>
                                    <h3 className="text-center text-xl font-bold">{selectedItem.customer}</h3>
                                    <p className="text-center text-sm text-gray-400">Repeated Customer</p>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                            <span className="text-gray-500">Phone</span>
                                            <span className="font-mono">{selectedItem.customer}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                            <span className="text-gray-500">Last Intent</span>
                                            <span className="capitalize text-[var(--gold-primary)]">{itemData(selectedItem).intent}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CRM / Notes Placeholder */}
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 opacity-50">
                                    <h4 className="text-sm font-bold text-gray-400 mb-2">Notes</h4>
                                    <textarea className="w-full bg-transparent text-sm resize-none outline-none" placeholder="Add customer notes..." rows="4"></textarea>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <Users size={48} className="mb-4 opacity-20" />
                                <p>Select a conversation to view details</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper safely access optional fields
const itemData = (item) => ({
    intent: item?.type || 'Unknown'
});

export default App;
