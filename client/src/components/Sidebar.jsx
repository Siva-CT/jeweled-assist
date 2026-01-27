import React from 'react';
import { LayoutDashboard, TrendingUp, Store, MessageSquare, Bell, User } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'rates', icon: TrendingUp, label: 'Live Rates' }, // Placeholder view or just scrolls
        { id: 'settings', icon: Store, label: 'Store Settings' },
        { id: 'inbox', icon: MessageSquare, label: 'AI Handoffs' },
        { id: 'notifications', icon: Bell, label: 'Notifications' }
    ];

    return (
        <div className="w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-dim)] h-full flex flex-col flex-shrink-0 z-20">
            {/* Header */}
            <div className="p-6 mb-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">💎</div>
                    <span className="font-bold text-lg tracking-tight text-white">Jeweled Assist</span>
                </div>
                <div className="pl-11">
                    <p className="text-xs font-bold text-white mb-0.5">Owner Dashboard</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Management Portal v2.4</p>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${isActive
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-blue-900/20'
                                    : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.icon size={18} opacity={isActive ? 1 : 0.7} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

            {/* User Footer */}
            <div className="p-4 border-t border-[var(--border-dim)]">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-[#fde68a] overflow-hidden border-2 border-white/10 flex items-center justify-center">
                        {/* Mock Avatar */}
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh" alt="User" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">Rajesh Kumar</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">Senior Admin</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
