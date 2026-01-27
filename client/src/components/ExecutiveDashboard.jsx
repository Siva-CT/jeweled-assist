import React, { useState, useEffect } from 'react';
import { TrendingUp, MessageSquare, AlertCircle, RefreshCw, Zap, Lightbulb, Search, Bell, HelpCircle, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';

const ExecutiveDashboard = () => {
    const [stats, setStats] = useState({
        goldRate: 7250,
        silverRate: 92.40,
        actionRequired: 0,
        totalInquiries: 0,
        pendingCount: 0
    });
    const [logs, setLogs] = useState([]);

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dashboard/stats`);
            const data = await res.json();
            if (data) setStats(data);

            // Dummy logs or fetch if available (using debug endpoint potentially or just static for now as per image "No recent activity" often)
            // But we want it to look alive.
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const cards = [
        {
            title: 'Active Conversations',
            value: stats.totalInquiries || '0',
            change: '+5%',
            sub: 'Total sessions in last 24h',
            icon: MessageSquare,
            style: 'border-[var(--border-dim)]'
        },
        {
            title: 'Requires Action',
            value: (stats.actionRequired || 0).toString().padStart(2, '0'),
            change: 'High Intent',
            sub: 'AI-to-Human handoffs pending',
            icon: AlertCircle,
            style: 'border-[#2563eb] bg-[#2563eb]/10',
            textStyle: 'text-[#2563eb]'
        },
        {
            title: 'Gold Rate (22K)',
            value: `₹${stats.goldRate.toLocaleString()}/g`,
            change: '~0.4%',
            sub: '• LIVE MARKET API',
            icon: TrendingUp, // Gold Icon usually
            style: 'border-[var(--border-dim)]',
            valueColor: 'text-white'
        },
        {
            title: 'Silver Rate (1g)',
            value: `₹${stats.silverRate}/g`,
            change: '~0.1%',
            sub: '• UPDATED 1M AGO',
            icon: Zap,
            style: 'border-[var(--border-dim)]'
        }
    ];

    return (
        <div className="flex-1 bg-[var(--bg-main)] p-8 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                    <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] text-[10px] font-bold rounded-full border border-[#10b981]/20 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                        LIVE SYSTEM
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search orders, customers..."
                            className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-64"
                        />
                    </div>
                    <button className="p-2 bg-[var(--bg-card)] rounded-lg text-gray-400 hover:text-white border border-[var(--border-dim)] relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                    </button>
                    <button className="p-2 bg-[var(--bg-card)] rounded-lg text-gray-400 hover:text-white border border-[var(--border-dim)]">
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-4 gap-5 mb-8">
                {cards.map((card, i) => (
                    <div key={i} className={`p-5 rounded-xl border bg-[var(--bg-card)] ${card.style} relative group`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[13px] font-medium text-[var(--text-secondary)]">{card.title}</span>
                            <card.icon size={18} className={card.textStyle || "text-gray-500"} />
                        </div>
                        <div className="flex items-baseline gap-3 mb-2">
                            <h3 className={`text-3xl font-bold ${card.textStyle || 'text-white'}`}>{card.value}</h3>
                            <span className={`text-xs font-bold ${card.change.includes('High') ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                                {card.change}
                            </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="border border-[var(--border-dim)] rounded-xl bg-[var(--bg-card)] mb-8 h-[350px] flex flex-col">
                <div className="p-4 border-b border-[var(--border-dim)] flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">Recent Activity</h3>
                    <button className="text-blue-500 text-xs font-bold flex items-center gap-1 hover:underline">
                        View Audit Log <ExternalLink size={12} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center mb-4 border border-[var(--border-dim)]">
                        <RefreshCw className="animate-spin-slow opacity-20" size={32} />
                    </div>
                    <h4 className="font-bold text-white mb-1">No recent activity</h4>
                    <p className="text-xs max-w-sm text-center opacity-60">
                        Your recent store actions, system alerts, and AI-to-Human handoffs will appear here as they occur.
                    </p>
                    <button onClick={fetchData} className="mt-6 px-4 py-2 bg-[#252b36] hover:bg-[#2f3745] rounded-lg text-xs font-bold text-white border border-[var(--border-dim)] flex items-center gap-2">
                        <RefreshCw size={14} /> Refresh Logs
                    </button>
                </div>
            </div>

            {/* Footer / Insights */}
            <div className="grid grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 flex gap-4">
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Zap size={18} fill="currentColor" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm mb-1">AI Assistant Pro-Tip</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Currently, AI is handling 85% of customer inquiries about product availability.
                            Your "Requires Action" count represents customers asking for custom quotes or physical store appointments.
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-dim)] flex gap-4">
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                            <Lightbulb size={18} fill="currentColor" />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm mb-1">Market Sentiment</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            Gold prices have been stable this week. This is typically a good time to run "No-Waste" exchange promotions
                            to increase store footfall.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
