import React, { useState, useEffect } from 'react';
import { Search, Bell, MessageSquare, AlertTriangle, TrendingUp, Zap, HelpCircle, Box } from 'lucide-react';
import { API_URL } from '../config';

const ExecutiveDashboard = () => {
    const [stats, setStats] = useState({
        goldRate: 0,
        silverRate: 0,
        actionRequired: 0,
        totalInquiries: 0
    });

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dashboard/stats`);
            const data = await res.json();
            if (data) setStats(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const cards = [
        {
            label: 'Active Conversations',
            val: stats.totalInquiries,
            sub: 'ACTIVE WHATSAPP SESSIONS',
            icon: MessageSquare,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            label: 'Requires Action',
            val: stats.actionRequired,
            sub: 'AI → HUMAN HANDOFFS',
            icon: AlertTriangle,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20'
        },
        {
            label: 'Gold Rate 22K',
            val: `₹${stats.goldRate.toLocaleString()}/g`,
            sub: 'LIVE MARKET API',
            icon: TrendingUp, // Or a custom icon
            color: 'text-green-400',
            bg: 'bg-green-500/5',
            border: 'border-green-500/10',
            badge: 'Live'
        },
        {
            label: 'Silver Rate 1g',
            val: `₹${stats.silverRate}/g`,
            sub: 'LIVE MARKET API',
            icon: Zap,
            color: 'text-green-400',
            bg: 'bg-green-500/5',
            border: 'border-green-500/10',
            badge: 'Live'
        }
    ];

    return (
        <div className="flex-1 bg-[var(--bg-main)] p-8 overflow-y-auto h-full text-white font-['Inter']">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h2>
                    <span className="px-2 py-0.5 bg-green-900/40 border border-green-500/30 text-green-400 text-[10px] font-bold rounded tracking-wider uppercase">
                        System Live
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search orders, clients..."
                            className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[var(--primary)] w-64 transition-colors"
                        />
                    </div>
                    <button className="p-2 bg-[var(--bg-card)] rounded-lg text-gray-400 hover:text-white border border-[var(--border-dim)] hover:bg-[#232634] transition-all">
                        <Bell size={20} />
                    </button>
                    <button className="p-2 bg-[var(--bg-card)] rounded-lg text-gray-400 hover:text-white border border-[var(--border-dim)] hover:bg-[#232634] transition-all">
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {/* Cards Row */}
            <div className="grid grid-cols-4 gap-6 mb-12">
                {cards.map((card, i) => (
                    <div key={i} className={`p-6 rounded-2xl bg-[var(--bg-card)] border ${card.border} relative group hover:translate-y-[-2px] transition-transform duration-300`}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color}`}>
                                <card.icon size={20} />
                            </div>
                            {card.badge && (
                                <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    {card.badge}
                                </span>
                            )}
                        </div>

                        {/* Value */}
                        <div className="mb-1">
                            <h3 className="text-3xl font-bold text-white tracking-tight">{card.val}</h3>
                            <p className="text-sm text-[var(--text-muted)] font-medium mt-1">{card.label}</p>
                        </div>

                        {/* Footer Sub */}
                        <div className="mt-8 pt-4 border-t border-white/5">
                            <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase opacity-60">
                                {card.sub}
                            </p>
                        </div>
                    </div>
                ))}
            </div>



            {/* Footer Copyright */}
            <div className="mt-12 flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase opacity-40">
                <p>Jeweled Assist Luxury Concierge © 2024</p>
                <div className="flex gap-4">
                    <span>Data Privacy</span>
                    <span>Node Status: Optimal</span>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
