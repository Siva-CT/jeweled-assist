import React from 'react';
import { DollarSign, Users, Activity } from 'lucide-react';

const DashboardStats = ({ stats }) => {
    return (
        <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-[#121212] p-6 rounded-xl border border-white/5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-gray-400 text-sm">Pending Request</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{stats.qualifiedleads}</h3>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Users size={24} /></div>
                </div>
            </div>
        </div>
    );
};
export default DashboardStats;
