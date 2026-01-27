import React, { useState, useEffect } from 'react';
import { Search, Bell, TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { API_URL } from '../config';

const ExecutiveDashboard = () => {
    const [stats, setStats] = useState({
        goldRate: 0,
        silverRate: 0,
        actionRequired: 0,
        totalInquiries: 0
    });
    const [inbox, setInbox] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel Fetch
                const [statsRes, inboxRes] = await Promise.all([
                    fetch(`${API_URL}/api/dashboard/stats`),
                    fetch(`${API_URL}/api/dashboard/inbox`)
                ]);

                const statsData = await statsRes.json();
                const inboxData = await inboxRes.json();

                if (statsData) setStats(statsData);
                if (inboxData) setInbox(inboxData.slice(0, 3)); // Top 3
            } catch (e) { console.error(e); }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex-1 bg-white p-8 overflow-y-auto h-full text-slate-800 font-['Inter']">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-3xl font-bold text-slate-900">Overview</h1>

                <div className="flex items-center gap-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3 text-gray-400" size={18} />
                        <input type="text" placeholder="Search" className="bg-gray-100/80 rounded-full pl-11 pr-5 py-2.5 text-sm font-medium w-64 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all" />
                    </div>
                    <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Bell size={22} className="text-slate-600" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="bg-[#1a1b23] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-black/10 hover:bg-[#2a2b36] transition-all">
                        Share insights
                    </button>
                </div>
            </div>

            {/* Top Cards Row */}
            <div className="grid grid-cols-3 gap-8 mb-10">
                {/* Card 1: Total Sales (Blue) */}
                <div className="bg-[#e3f5ff] p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                            <ShoppingCart size={20} fill="currentColor" className="opacity-20" />
                            <ShoppingCart size={20} className="absolute" />
                        </div>
                        <span className="text-sm font-bold text-slate-500">Gold Rate (22K)</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h2 className="text-3xl font-bold text-slate-900">₹{stats.goldRate.toLocaleString()}</h2>
                        <ArrowUpRight className="text-slate-900 mb-1" />
                    </div>
                </div>

                {/* Card 2: Total Profit (Yellow) */}
                <div className="bg-[#e5fcc2] p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">Silver Rate</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h2 className="text-3xl font-bold text-slate-900">₹{stats.silverRate.toLocaleString()}</h2>
                        <ArrowDownRight className="text-slate-900 mb-1" />
                    </div>
                </div>

                {/* Card 3: Total Orders (Purple) */}
                <div className="bg-[#e4dcfc] p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                            <Package size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">Active Chats</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <h2 className="text-3xl font-bold text-slate-900">{stats.totalInquiries}</h2>
                        <ArrowUpRight className="text-slate-900 mb-1" />
                    </div>
                </div>
            </div>

            {/* Middle Section: Big Chart + Donut */}
            <div className="grid grid-cols-3 gap-8 mb-10 h-80">
                {/* Main Line Chart (Spans 2 cols) */}
                <div className="col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Sales Analytics</h3>
                        <div className="flex gap-4 text-xs font-semibold">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                <span className="text-slate-500">Offline sales</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#d6fd52]"></span>
                                <span className="text-slate-500">Online sales</span>
                            </div>
                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-slate-600 cursor-pointer">Monthly ▾</span>
                        </div>
                    </div>
                    {/* CSS Line Chart Mock */}
                    <div className="flex-1 relative border-l border-b border-gray-100">
                        {/* Grid Lines */}
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="absolute w-full border-t border-gray-50 h-px" style={{ bottom: `${i * 20}%` }}></div>
                        ))}

                        {/* Purple Line Path */}
                        <svg className="absolute inset-0 w-full h-full overflow-visible p-2">
                            <path d="M0,80 C100,70 150,90 200,60 C250,30 300,50 400,20 C500,-10 600,40 800,10"
                                fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
                            {/* Green Line Path */}
                            <path d="M0,120 C100,100 150,110 200,90 C250,70 300,80 400,60 C500,40 600,70 800,50"
                                fill="none" stroke="#d6fd52" strokeWidth="3" strokeLinecap="round" />
                        </svg>

                        {/* X Axis Labels */}
                        <div className="absolute -bottom-8 w-full flex justify-between text-xs text-slate-400 font-medium px-4">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                        </div>
                    </div>
                </div>

                {/* Earnings Donut */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900">Earnings</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                        {/* SVG Donut */}
                        <svg viewBox="0 0 36 36" className="w-48 h-48 rotate-[-90deg]">
                            {/* Background Ring */}
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                            {/* Black Segment (Sales) */}
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#1a1b23" strokeWidth="3" strokeDasharray="60, 100" />
                            {/* Green Segment (Profit) */}
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#d6fd52" strokeWidth="3" strokeDasharray="25, 100" strokeDashoffset="-65" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-bold text-slate-900">82%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Growth</span>
                        </div>
                    </div>
                    <div className="flex justify-around text-xs font-bold text-slate-600 mt-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#1a1b23] rounded-full"></span> Sales</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#d6fd52] rounded-full"></span> Profit</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Table + Activity */}
            <div className="grid grid-cols-3 gap-8 mb-4 h-64">
                {/* Table (2 cols) */}
                <div className="col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Conversations</h3>
                    <div className="flex-1 overflow-visible">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="pb-3 font-semibold pl-2">Customer</th>
                                    <th className="pb-3 font-semibold">Intent</th>
                                    <th className="pb-3 font-semibold">Status</th>
                                    <th className="pb-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {inbox.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-400">No active conversations</td></tr>
                                ) : (
                                    inbox.map((row) => (
                                        <tr key={row.phone} className="group hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 border-dashed">
                                            <td className="py-3 pl-2 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {row.name.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-slate-700">{row.name}</span>
                                            </td>
                                            <td className="py-3 text-slate-500">{row.lastIntent}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.status === 'Needs Action' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                                                    }`}>{row.status}</span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-900">
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Vertical Bar Chart (Dark) */}
                <div className="bg-[#1a1b23] rounded-3xl p-6 flex flex-col relative text-white">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold">Activity</h3>
                        <span className="px-2 py-1 bg-white/10 rounded text-[10px]">Weekly</span>
                    </div>
                    {/* Bar Chart Mock */}
                    <div className="flex-1 flex items-end justify-between px-2 pb-2 gap-2">
                        {[40, 70, 30, 85, 50, 60, 90].map((h, i) => (
                            <div key={i} className="w-3 bg-gray-700 rounded-full relative group" style={{ height: '100%' }}>
                                <div className="absolute bottom-0 w-full bg-[#e4dcfc] group-hover:bg-[#d6fd52] transition-colors rounded-full" style={{ height: `${h}%` }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-2">
                        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ExecutiveDashboard;
