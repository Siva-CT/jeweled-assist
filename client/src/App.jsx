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

    // Audio Ref
    const audioRef = React.useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')); // Gentle bell

    // Polling Data
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
                    audioRef.current.play().catch(e => console.log("Audio play failed (user interaction needed)"));
                }

                setPending(newInbox);
            } catch (e) {
                console.error("API Error", e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 3000); // Faster polling for Chat
        return () => clearInterval(interval);
    }, [pending]); // Dep on pending to compare

    const handleApprove = async (id, finalPrice) => {
        await fetch(`${API_URL}/api/dashboard/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, finalPrice })
        });
        // Optimistic Update
    };

    const selectedItem = pending.find(p => p.phone === selectedId) || null;
    const itemData = (item) => ({ intent: item?.intent || 'Unknown' });

    // --- RENDER HELPERS ---

    // Total Queries Page (Read-Only Analytics)
    const renderTotalQueries = () => {
        const [analyticsData, setAnalyticsData] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetch(`${API_URL}/api/dashboard/analytics/monthly-customers`)
                .then(res => res.json())
                .then(data => {
                    setAnalyticsData(data);
                    setLoading(false);
                })
                .catch(e => {
                    console.error(e);
                    setLoading(false);
                });
        }, []);

        return (
            <div className="flex-1 bg-[var(--bg-deep)] p-8 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-[var(--gold-primary)] font-serif mb-1">Total Queries</h2>
                        <p className="text-gray-500 text-sm">Monthly Aggregated Analytics</p>
                    </div>
                </div>

                <div className="bg-[var(--bg-panel)] rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#111] text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/5">
                                <th className="p-4">Customer Number</th>
                                <th className="p-4">Queries This Month</th>
                                <th className="p-4">Query Types</th>
                                <th className="p-4">Store Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading analytics...</td></tr>
                            ) : analyticsData.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-500">No queries found for this month used.</td></tr>
                            ) : (
                                analyticsData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-[var(--gold-primary)]">{row.customer}</td>
                                        <td className="p-4 font-bold">{row.queriesThisMonth}</td>
                                        <td className="p-4">
                                            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs border border-blue-500/10 uppercase">
                                                {row.queryTypes || 'General'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.storeVisit === 'Yes' ? 'bg-green-500/20 text-green-500' : 'text-gray-500'}`}>
                                                {row.storeVisit}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // The 3-Pane Inbox Layout
    const renderInbox = () => (
        <div className="flex flex-1 overflow-hidden h-full">
            {/* LEFT PANEL (Inbox List) */}
            <div className="w-[20%] min-w-[250px] flex flex-col border-r border-white/5 bg-[var(--bg-panel)]">
                {/* Header */}
                <div className="p-4 border-b border-white/5 h-[65px] flex items-center justify-between">
                    <h2 className="font-bold text-lg text-white">Inbox</h2>
                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400">{pending.length} Chats</span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {pending.length === 0 ? (
                        <div className="text-center py-10 text-gray-600 text-sm">No active conversations</div>
                    ) : (
                        pending.map(item => (
                            <div
                                key={item.phone}
                                onClick={() => { setSelectedId(item.phone); }}
                                className={`p-3 rounded-lg cursor-pointer transition-all border group relative ${selectedId === item.phone
                                    ? 'bg-[var(--gold-glow)] border-[var(--gold-primary)]'
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`font-medium text-sm truncate w-[60%] ${selectedId === item.phone ? 'text-[var(--gold-primary)]' : 'text-gray-200'}`}>
                                        {item.phone}
                                    </span>
                                    {item.actionRequired && (
                                        <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">ACTION</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-gray-500 truncate w-[70%]">
                                        {item.lastQuery || 'New Conversation'}
                                    </p>
                                    <span className="text-[9px] text-gray-600 font-mono">
                                        {item.lastContact ? new Date(item.lastContact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                {/* Tags */}
                                <div className="flex gap-1 flex-wrap">
                                    {item.intent && (
                                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10 uppercase tracking-wide">
                                            {item.intent}
                                        </span>
                                    )}
                                    {item.metal && (
                                        <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/10 uppercase tracking-wide">
                                            {item.metal}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MIDDLE PANEL (Chat) */}
            <div className="w-[50%] flex flex-col border-r border-white/5 bg-[var(--bg-deep)] relative">
                {/* Fix: Pass customer as phone for ChatArea */}
                <ChatArea selectedItem={selectedItem ? { ...selectedItem, customer: selectedItem.phone } : null} onApprove={handleApprove} />
            </div>

            {/* RIGHT PANEL (Context) */}
            <div className="w-[30%] min-w-[300px] flex flex-col bg-[var(--bg-panel)]">
                <div className="p-4 border-b border-white/5 h-[65px] flex items-center">
                    <h2 className="font-bold text-lg text-white">Context & Actions</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {selectedItem ? (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="bg-white/5 p-5 rounded-xl border border-white/5 text-center relative overflow-hidden">
                                {selectedItem.actionRequired && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
                                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-2xl mb-4 mx-auto border-2 border-white/10">
                                    👤
                                </div>
                                <h3 className="text-lg font-bold text-white">{selectedItem.phone}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Customer</p>
                            </div>

                            {/* Intent Card */}
                            <div className="bg-[#0f161d] p-4 rounded-xl border border-white/5 space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Intent</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">Goal</span>
                                    <span className="text-[var(--gold-primary)] font-bold text-sm">{selectedItem.intent || 'Browsing'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">Interest</span>
                                    <span className="text-white font-mono text-sm">{selectedItem.metal || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">Status</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${selectedItem.actionRequired ? 'bg-red-500 text-black' : 'bg-green-500/20 text-green-500'}`}>
                                        {selectedItem.actionRequired ? 'REQUIRES ACTION' : 'Active'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2">
                                <button className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg border border-white/10 text-sm font-medium transition-colors">
                                    Mark as Resolved
                                </button>
                                <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-lg border border-red-500/20 text-sm font-bold transition-colors">
                                    Block Customer
                                </button>
                            </div>

                            {/* Notes */}
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 opacity-80">
                                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Staff Notes</h4>
                                <textarea className="w-full bg-transparent text-sm resize-none outline-none text-gray-300 placeholder-gray-600" rows="4" placeholder="Add internal notes about this customer..."></textarea>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-600">
                            <AlertCircle size={48} className="mb-4 opacity-20" />
                            <p className="text-sm">Select a conversation to view details</p>
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
                {activePage === 'inbox' && renderInbox()}
                {activePage === 'customers' && renderTotalQueries()}
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
