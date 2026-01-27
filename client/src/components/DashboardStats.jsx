import React from 'react';
import { DollarSign, Users, Activity } from 'lucide-react';

const DashboardStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Pending Requests */}
            <div className="bg-[#121212] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--gold-primary)]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Pending Actions</p>
                        <h3 className="text-3xl font-bold text-white mt-2">{stats.pendingCount || 0}</h3>
                    </div>
                    <div className="p-3 bg-[var(--gold-primary)]/10 rounded-lg text-[var(--gold-primary)]"><Users size={24} /></div>
                </div>
                <div className="text-xs text-gray-500 relative z-10 w-full flex justify-between">
                    <span>Queries awaiting approval</span>
                    <span className="text-[var(--gold-primary)] cursor-pointer hover:underline">View Queue →</span>
                </div>
            </div>

            {/* Live Gold Rate */}
            <div className="bg-[#121212] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Gold Rate (22K)</p>
                        <h3 className="text-3xl font-bold text-white mt-2 flex items-baseline gap-1">
                            ₹{stats.goldRate ? stats.goldRate.toLocaleString() : 'Loading...'}
                            <span className="text-xs font-normal text-gray-500">/g</span>
                        </h3>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Activity size={24} /></div>
                </div>
                <div className="text-xs text-gray-500 relative z-10">
                    Live market value (916 Purity)
                </div>
            </div>

            {/* Silver Rate */}
            <div className="bg-[#121212] p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-400/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Silver Rate</p>
                        <h3 className="text-3xl font-bold text-white mt-2 flex items-baseline gap-1">
                            ₹{stats.silverRate ? stats.silverRate.toLocaleString() : 'Loading...'}
                            <span className="text-xs font-normal text-gray-500">/g</span>
                        </h3>
                    </div>
                    <div className="p-3 bg-gray-400/10 rounded-lg text-gray-400"><DollarSign size={24} /></div>
                </div>
                <div className="text-xs text-gray-500 relative z-10">
                    Live market value
                </div>
            </div>
        </div>
    );
};
export default DashboardStats;
