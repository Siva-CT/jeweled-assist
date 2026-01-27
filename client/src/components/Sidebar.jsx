import React from 'react';
import { LayoutDashboard, MessageSquare, Users, Settings } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
        { id: 'customers', icon: Users, label: 'Total Queries' },
        { id: 'settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <div className="w-64 bg-[var(--bg-panel)] border-r border-white/5 h-full flex flex-col p-4 z-20">
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--gold-dim)] to-[var(--gold-primary)] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-yellow-900/20">💎</div>
                <div>
                    <h1 className="font-bold text-lg text-white leading-none tracking-wide">JEWELED</h1>
                    <span className="text-[10px] text-[var(--gold-primary)] font-bold tracking-[0.2em] uppercase">ASSIST</span>
                </div>
            </div>

            <div className="space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activePage === item.id
                            ? 'bg-gradient-to-r from-[var(--gold-dim)]/20 to-transparent text-[var(--gold-primary)] border-l-2 border-[var(--gold-primary)]'
                            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        <item.icon size={20} className={`transition-transform group-hover:scale-110 ${activePage === item.id ? 'text-[var(--gold-primary)]' : ''}`} />
                        <span className="font-medium text-sm">{item.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-auto px-4 py-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-black border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">System Status</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-green-500">Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
