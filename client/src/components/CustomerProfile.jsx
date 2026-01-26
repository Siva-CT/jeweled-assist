import React from 'react';
import { Phone, MapPin, User, Mail, Tag, Moon, Sun } from 'lucide-react';

const CustomerProfile = ({ selectedItem, allRequests, darkMode, toggleDarkMode }) => {
    if (!selectedItem) {
        return (
            <div className="w-80 bg-[#121212] border-l border-jewelry-gold/10 p-6 flex flex-col gap-6 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-white">Overview</h3>
                    <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/10 text-jewelry-gold">
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
                <p className="text-gray-500 text-sm">Select a conversation to view details.</p>
            </div>
        );
    }

    return (
        <div className="w-80 border-l border-jewelry-gold/10 bg-[#121212] flex flex-col h-full flex-shrink-0 overflow-y-auto transition-colors">
            {/* Header Info */}
            <div className="p-6 text-center border-b border-jewelry-gold/10 relative">
                <div className="absolute top-4 right-4">
                    <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-white/10 text-jewelry-gold">
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-black rounded-full mx-auto mb-4 border border-jewelry-gold/20 flex items-center justify-center shadow-lg relative">
                    <span className="text-2xl">👤</span>
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-black rounded-full"></span>
                </div>
                <h2 className="font-bold text-lg text-white">{selectedItem.customer}</h2>
                <p className="text-xs text-jewelry-gold mt-1">Returning Customer</p>
            </div>

            <div className="p-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Inquiry History ({allRequests.length})</h3>

                <div className="space-y-3">
                    {allRequests.map(req => (
                        <div key={req.id} className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
                            <div className="flex justify-between mb-1">
                                <span className="text-jewelry-gold font-bold">{req.metal || 'Gold'}</span>
                                <span className="text-gray-500">{new Date(req.timestamp).toLocaleDateString()}</span>
                            </div>
                            {req.type === 'support_request'
                                ? <p className="text-blue-300">Chat Session</p>
                                : <p className="text-gray-300">{req.weight}g • Budget: {req.budget}</p>
                            }
                            <span className={`block mt-2 text-[9px] uppercase tracking-wider font-bold ${req.status === 'approved' ? 'text-green-500' : 'text-yellow-500'
                                }`}>
                                {req.status.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 mt-auto border-t border-jewelry-gold/10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Details</h3>
                <InfoRow icon={<Phone size={14} />} label="Phone" value={selectedItem.customer.replace('whatsapp:', '')} />
                <InfoRow icon={<MapPin size={14} />} label="Region" value="India" />
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-2 text-gray-500">
            {icon}
            <span>{label}</span>
        </div>
        <span className="font-medium text-gray-300">{value}</span>
    </div>
);

export default CustomerProfile;
