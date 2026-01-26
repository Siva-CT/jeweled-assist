import React from 'react';
import { TrendingUp, Users, ShoppingBag, Activity } from 'lucide-react';

const DashboardStats = ({ stats, pending }) => {
    return (
        <div className="flex-1 p-8 bg-[#0a0a0a] overflow-y-auto text-gray-200">
            <header className="mb-8 flex justify-between items-end border-b border-jewelry-gold/10 pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-jewelry-gold mb-2">Executive Overview</h1>
                    <p className="text-sm text-gray-500 font-light">Welcome back, Owner.</p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-jewelry-gold uppercase tracking-widest block mb-1">Live Gold Rate</span>
                    <span className="text-2xl font-bold text-white bg-jewelry-gold/10 px-4 py-1 rounded border border-jewelry-gold/20">
                        ₹{stats.goldRate.toLocaleString()}<span className="text-sm text-gray-400 font-normal">/g</span>
                    </span>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<Users className="text-jewelry-gold" />}
                    label="Total Inquiries"
                    value={stats.qualifiedleads || 0}
                    sub="+12% from last week"
                />
                <StatCard
                    icon={<ShoppingBag className="text-jewelry-gold" />}
                    label="Pending Actions"
                    value={pending.filter(p => p.status === 'pending_approval').length}
                    sub="Requires attention"
                    highlight
                />
                <StatCard
                    icon={<TrendingUp className="text-green-400" />}
                    label="Silver Rate"
                    value={`₹${stats.silverRate || '92'}/g`}
                    sub="Live Yahoo Finance"
                />
                <StatCard
                    icon={<Activity className="text-blue-400" />}
                    label="Conversion Rate"
                    value="4.2%"
                    sub="Based on approvals"
                />
            </div>

            {/* Recent Activity */}
            <div className="bg-[#121212] rounded-xl p-6 border border-jewelry-gold/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-jewelry-gold to-jewelry-dark"></div>
                <h2 className="font-serif text-xl mb-6 text-jewelry-gold-light">Recent Activity</h2>
                <div className="space-y-4">
                    {pending.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition px-2 rounded-lg cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-jewelry-gold/10 flex items-center justify-center text-lg border border-jewelry-gold/20 text-jewelry-gold">
                                    {item.status === 'approved' ? '✅' : '⏳'}
                                </div>
                                <div>
                                    <h4 className="font-medium text-white tracking-wide">{item.customer}</h4>
                                    <p className="text-xs text-gray-500 font-light mt-0.5">{item.weight}g Inquiry • ₹{item.budget}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase border ${item.status === 'approved'
                                ? 'bg-green-900/20 text-green-400 border-green-900/50'
                                : 'bg-jewelry-gold/10 text-jewelry-gold border-jewelry-gold/20'
                                }`}>
                                {item.status.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, sub, highlight }) => (
    <div className={`p-6 rounded-xl border transition-all duration-300 hover:transform hover:-translate-y-1 ${highlight
        ? 'bg-gradient-to-br from-jewelry-gold/20 to-jewelry-dark border-jewelry-gold/30 shadow-lg shadow-jewelry-gold/5'
        : 'bg-[#121212] border-white/5 hover:border-jewelry-gold/20'
        }`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg ${highlight ? 'bg-black/40' : 'bg-white/5'}`}>
                {icon}
            </div>
        </div>
        <h3 className="text-3xl font-bold text-white mb-1 font-serif">{value}</h3>
        <p className="text-jewelry-gold-light/60 text-xs uppercase tracking-widest mb-2">{label}</p>
        <p className="text-xs text-gray-500 font-light">{sub}</p>
    </div>
);

export default DashboardStats;
