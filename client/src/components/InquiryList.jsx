import React, { useEffect } from 'react';
import { Search, Filter } from 'lucide-react';

const InquiryList = ({ requests, selectedId, onSelect, width, setWidth }) => {
    // Group by Customer
    const uniqueCustomers = requests.reduce((acc, req) => {
        if (!acc[req.customer]) {
            acc[req.customer] = { ...req, count: 1, latest: req.timestamp };
        } else {
            acc[req.customer].count += 1;
            if (new Date(req.timestamp) > new Date(acc[req.customer].latest)) {
                acc[req.customer] = { ...req, count: acc[req.customer].count, latest: req.timestamp };
            }
        }
        return acc;
    }, {});

    const sortedList = Object.values(uniqueCustomers).sort((a, b) => new Date(b.latest) - new Date(a.latest));

    return (
        <div
            className="bg-[#121212] border-r border-jewelry-gold/10 flex flex-col h-full flex-shrink-0 transition-all relative group"
            style={{ width: width }}
        >
            {/* Resize Handle */}
            <div
                className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-jewelry-gold/50 z-50 transition-colors"
                onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = width;
                    const handleMouseMove = (mw) => setWidth(startWidth + mw.clientX - startX);
                    const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                }}
            />

            <div className="p-6 border-b border-jewelry-gold/10">
                <h2 className="font-serif text-xl mb-4 text-jewelry-gold-light tracking-wide">Inbox</h2>
                <div className="flex gap-4 mb-4">
                    <button className="text-xs font-bold uppercase tracking-wider border-b-2 border-jewelry-gold text-white pb-1">Open ({sortedList.length})</button>
                    <button className="text-xs font-bold uppercase tracking-wider text-gray-600 pb-1 hover:text-gray-400">Archived</button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        className="w-full bg-[#0a0a0a] border border-white/5 focus:border-jewelry-gold/30 rounded-lg pl-9 pr-4 py-2 text-sm outline-none transition-colors text-gray-300 placeholder-gray-600"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sortedList.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-gray-600 text-sm">No active conversations.</p>
                    </div>
                ) : (
                    sortedList.map((req) => (
                        <div
                            key={req.customer}
                            onClick={() => onSelect(req)}
                            className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 relative ${selectedId === req.id ? 'bg-gradient-to-r from-jewelry-gold/10 to-transparent border-l-2 border-l-jewelry-gold' : 'border-l-2 border-l-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className={`font-medium text-sm ${selectedId === req.id ? 'text-jewelry-gold' : 'text-gray-300'}`}>
                                    {req.customer.slice(-4)}...
                                </h3>
                                <span className="text-[10px] text-gray-600">
                                    {new Date(req.latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                {req.type === 'support_request'
                                    ? <span className="text-blue-400 font-bold">💬 Chat Request</span>
                                    : <><span className="text-gray-400 font-medium">{req.weight}g {req.metal}</span> • ₹{req.budget}</>
                                }
                            </p>
                            {req.count > 1 && (
                                <span className="absolute top-4 right-4 bg-gray-700 text-white text-[9px] px-1.5 rounded-full">{req.count}</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default InquiryList;
