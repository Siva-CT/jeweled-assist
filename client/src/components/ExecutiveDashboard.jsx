import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, Activity, ArrowUpRight } from 'lucide-react';
import { API_URL } from '../config';

const ExecutiveDashboard = () => {
    const [stats, setStats] = useState({
        goldRate: 0,
        silverRate: 0,
        qualifiedleads: 0,
        pendingCount: 0,
        totalInquiries: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${API_URL}/api/dashboard/stats`);
                const data = await res.json();
                setStats(data);

                // Fetch recent queries for the activity feed
                const custRes = await fetch(`${API_URL}/api/dashboard/all-customers`);
                const custData = await custRes.json();
                setRecentActivity(custData.slice(0, 5)); // Top 5
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const conversionRate = stats.totalInquiries > 0
        ? ((stats.qualifiedleads / stats.totalInquiries) * 100).toFixed(1)
        : '0.0';

    const cards = [
        { label: 'TOTAL INQUIRIES', value: stats.totalInquiries || 0, sub: '+12% from last week', icon: Users },
        { label: 'PENDING ACTIONS', value: stats.pendingCount || 0, sub: 'Requires attention', icon: Clock, highlight: stats.pendingCount > 0 },
        { label: 'SILVER RATE', value: `₹${stats.silverRate}/g`, sub: 'Live Market Rate', icon: TrendingUp },
        { label: 'CONVERSION RATE', value: `${conversionRate}%`, sub: 'Leads to Sales', icon: Activity },
    ];

    return (
        <div className="flex-1 bg-[var(--bg-deep)] p-8 overflow-y-auto custom-scrollbar">
            {/* Top Bar */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--gold-primary)] font-serif mb-1">Executive Overview</h2>
                    <p className="text-gray-500 text-sm">Welcome back, Owner.</p>
                </div>
                <div className="bg-[#111] px-4 py-2 rounded-lg border border-white/10 flex items-center gap-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Live Gold Rate</span>
                    <span className="text-xl font-bold text-white font-mono">₹{stats.goldRate}</span>
                    <span className="text-[10px] text-gray-600">/g (22K)</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-10">
                {cards.map((card, idx) => (
                    <div key={idx} className={`p-6 rounded-xl border relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${card.highlight ? 'bg-yellow-900/10 border-yellow-500/30' : 'bg-[#0f161d] border-white/5'}`}>
                        <div className={`p-3 rounded-lg w-fit mb-4 ${card.highlight ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400'}`}>
                            <card.icon size={20} />
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{card.value}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{card.label}</p>
                        <p className={`text-xs ${card.highlight ? 'text-yellow-500' : 'text-gray-600'}`}>{card.sub}</p>

                        {/* Hover Effect */}
                        <div className="absolute -right-4 -bottom-4 opacity-0 group-hover:opacity-10 transition-opacity">
                            <card.icon size={80} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="border border-white/5 rounded-xl bg-[#0a1016] overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-[#0f161d]">
                    <h3 className="font-bold text-[var(--gold-primary)] font-serif">Recent Activity</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {recentActivity.map((item, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 text-xs font-mono border border-white/5">
                                    {item.customer.slice(-2)}
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-sm flex items-center gap-2">
                                        {item.customer}
                                        <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--gold-primary)]" />
                                    </h4>
                                    <p className="text-xs text-gray-500 line-clamp-1 max-w-sm">{item.lastQuery || 'Started conversation'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] text-gray-600 font-mono">
                                    {new Date(item.lastContact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {idx === 0 && <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-bold border border-yellow-500/20">NEW</span>}
                            </div>
                        </div>
                    ))}
                    {recentActivity.length === 0 && <div className="p-8 text-center text-gray-600 text-sm">No recent activity</div>}
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
