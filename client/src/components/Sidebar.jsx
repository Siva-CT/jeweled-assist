import React from 'react';
import { LayoutDashboard, MessageSquare, Users, Settings } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'customers', icon: Users, label: 'Customers' },
        { id: 'settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <div className="w-64 bg-[#0a0a0a] border-r border-white/5 h-full flex flex-col p-4">
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-2xl">💎</div>
                <h1 className="font-bold text-xl text-white">Jeweled<span className="text-yellow-500">Assist</span></h1>
            </div>

            <div className="space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activePage === item.id
                                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
