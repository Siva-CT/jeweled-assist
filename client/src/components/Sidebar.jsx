import React from 'react';
import { LayoutDashboard, Inbox, Users, Settings, LogOut, Gem } from 'lucide-react';

const Sidebar = ({ activePage, onNavigate }) => {
    return (
        <div className="w-64 bg-jewelry-dark border-r border-jewelry-gold/20 flex flex-col h-full flex-shrink-0 transition-colors duration-300 shadow-2xl">
            <div className="p-8 flex items-center gap-3">
                <div className="bg-gradient-to-br from-jewelry-gold to-jewelry-bronze p-2 rounded-lg shadow-lg shadow-jewelry-gold/20">
                    <Gem className="w-6 h-6 text-jewelry-dark" />
                </div>
                <h1 className="font-serif font-bold text-xl text-jewelry-gold tracking-wider">
                    JEWELED<span className="font-sans text-xs text-jewelry-gold-light block tracking-[0.2em] font-light">ASSIST</span>
                </h1>
            </div>

            <nav className="flex-1 px-4 space-y-3 mt-4">
                <NavItem
                    icon={<LayoutDashboard size={20} />}
                    label="Dashboard"
                    active={activePage === 'dashboard'}
                    onClick={() => onNavigate('dashboard')}
                />
                <NavItem
                    icon={<Inbox size={20} />}
                    label="Inbox"
                    active={activePage === 'inbox'}
                    onClick={() => onNavigate('inbox')}
                />
                <NavItem
                    icon={<Users size={20} />}
                    label="Total Queries"
                    active={activePage === 'customers'}
                    onClick={() => onNavigate('customers')}
                />
                <NavItem
                    icon={<Settings size={20} />}
                    label="Settings"
                    active={activePage === 'settings'}
                    onClick={() => onNavigate('settings')}
                />
            </nav>

            <div className="p-6 border-t border-jewelry-gold/10">
                <button className="flex items-center gap-3 text-jewelry-gold-light/60 hover:text-red-400 transition-colors w-full px-4 py-2 font-light tracking-wide text-sm">
                    <LogOut size={18} />
                    <span>LOGOUT</span>
                </button>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, badge, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${active
            ? 'bg-gradient-to-r from-jewelry-gold/20 to-transparent text-jewelry-gold border-l-4 border-jewelry-gold'
            : 'text-gray-400 hover:text-jewelry-gold-light hover:bg-white/5'
            }`}>

        <span className={`relative z-10 ${active ? 'text-jewelry-gold' : 'group-hover:text-jewelry-gold transition-colors'}`}>
            {icon}
        </span>
        <span className="flex-1 text-left font-medium tracking-wide relative z-10">{label}</span>

        {badge && (
            <span className="bg-jewelry-gold text-jewelry-dark text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg shadow-jewelry-gold/20">
                {badge}
            </span>
        )}
    </button>
);

export default Sidebar;
