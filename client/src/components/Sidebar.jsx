import React from 'react';
import { LayoutDashboard, TrendingUp, Users, Calendar, Settings, LogOut, Bell, HelpCircle } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'inbox', icon: Users, label: 'Inbox' },
        { id: 'settings', icon: Settings, label: 'Store Settings' }
    ];

    return (
        <div className="w-64 bg-[var(--bg-sidebar)] h-full flex flex-col flex-shrink-0 border-r border-[var(--border-dim)] z-20 font-['Inter']">
            {/* Header */}
            <div className="p-6 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#fbbf24] rounded-xl flex items-center justify-center text-black font-bold shadow-lg shadow-orange-500/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 3h12l4 6-10 13L2 9z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-white font-bold text-base leading-tight">Jeweled Assist</h1>
                    <p className="text-[10px] text-[var(--gold)] font-medium tracking-wider uppercase">Luxury Concierge</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-900/40'
                                    : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={18} className={isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            {/* Footer Profile */}
            <div className="p-4 border-t border-[var(--border-dim)] bg-[#0b0c15]/30">

            </div>
        </div>
    );
};

export default Sidebar;
