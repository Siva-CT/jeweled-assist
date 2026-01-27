import React from 'react';
import { LayoutDashboard, TrendingUp, Users, Calendar, Settings, LogOut, Bell, HelpCircle } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {

    const menuItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'rates', icon: TrendingUp, label: 'Live Rates' },
        { id: 'customers', icon: Users, label: 'Customers' },
        { id: 'inbox', icon: Calendar, label: 'Calendar / Events' }, // Reusing Inbox ID for now to avoid breaking App.jsx switch
        { id: 'support', icon: HelpCircle, label: 'Support' },
        { id: 'settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <div className="w-64 bg-[#1a1b23] h-full flex flex-col flex-shrink-0 border-r border-[#2a2b36]">
            {/* Profile Section (Top) */}
            <div className="p-8 pb-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[#fcd34d] mb-4 overflow-hidden border-2 border-white/5 relative">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Angela" className="w-full h-full object-cover" alt="Profile" />
                </div>
                <h3 className="text-white font-bold text-lg">Angela Grey</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">angela@gmail.com</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-6 space-y-2 mt-8">
                {menuItems.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
                                ${isActive
                                    ? 'text-white' // Active: Just white text, usually has a side indicator or bold
                                    : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            {/* Icon Wrapper */}
                            <div className={`transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
                                <item.icon size={20} strokeWidth={2} />
                            </div>
                            {item.label}

                            {/* Active Indicator (Dot) - Optional based on image */}
                        </button>
                    )
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-6 mb-4">
                <button className="w-full flex items-center gap-4 px-4 py-3 text-gray-500 hover:text-white transition-colors text-[13px] font-medium">
                    <LogOut size={20} />
                    Logout
                </button>
            </div>

            {/* Decorative Background Lines (CSS optional) */}
            <div className="absolute bottom-0 left-0 w-full h-64 pointer-events-none opacity-5" style={{
                backgroundImage: 'radial-gradient(circle at bottom left, #ffffff 1px, transparent 1px)',
                backgroundSize: '20px 20px'
            }}></div>
        </div>
    );
};

export default Sidebar;
