import React, { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';

const ChatArea = ({ selectedItem, onApprove }) => {
    // const [isEstimate, setIsEstimate] = useState(false); // Removed: Derived from props
    const [price, setPrice] = useState(selectedItem?.estimatedCost || '');
    const [chatInput, setChatInput] = useState('');
    const [history, setHistory] = useState([]);
    const [botMode, setBotMode] = useState('bot'); // 'bot' (Green) or 'agent' (Red)

    // Fetch History & Bot Status
    useEffect(() => {
        if (selectedItem?.customer) {
            const fetchChatData = () => {
                fetch(`${API_URL}/api/dashboard/chat/${encodeURIComponent(selectedItem.customer)}`)
                    .then(res => res.json())
                    .then(data => setHistory(data));

                fetch(`${API_URL}/api/dashboard/bot-status/${encodeURIComponent(selectedItem.customer)}`)
                    .then(res => res.json())
                    .then(data => setBotMode(data.mode));
            };

            fetchChatData();
            const interval = setInterval(fetchChatData, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedItem]);

    const toggleBot = async () => {
        const newMode = botMode === 'bot' ? 'agent' : 'bot';
        await fetch(`${API_URL}/api/dashboard/toggle-bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: selectedItem.customer, mode: newMode })
        });
        setBotMode(newMode);
    };

    if (!selectedItem) {
        return (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-jewelry-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">💎</span>
                    </div>
                    <p className="text-jewelry-gold text-lg font-serif">Select an inquiry to view</p>
                </div>
            </div>
        );
    }

    const handleApprove = () => onApprove(selectedItem.id, price);

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        await fetch(`${API_URL}/api/dashboard/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: selectedItem.customer, text: chatInput })
        });
        setChatInput('');
        setHistory([...history, { from: 'owner', text: chatInput, timestamp: new Date() }]);
    };

    const isEstimate = selectedItem.type === 'estimate';

    return (
        <div className="flex-1 flex flex-col bg-[#0a0a0a] border-l border-white/5 relative h-full">
            {/* Header */}
            <div className="p-4 border-b border-jewelry-gold/10 bg-[#121212]/50 backdrop-blur-md flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jewelry-gold to-jewelry-bronze p-[2px]">
                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-xs font-bold text-jewelry-gold">
                            {selectedItem.customer.slice(-4)}
                        </div>
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-200">{isEstimate ? 'Price Estimate' : 'Support Chat'}</h2>
                        <p className="text-xs text-jewelry-gold">
                            {isEstimate ? `${selectedItem.weight}g ${selectedItem.metal || 'Gold'}` : 'Sales Inquiry'}
                        </p>
                    </div>
                </div>

                {/* BOT CONTROL BUTTON */}
                <button
                    onClick={toggleBot}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all uppercase tracking-widest shadow-lg ${botMode === 'bot'
                        ? 'bg-green-500/10 text-green-500 border border-green-500/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500'
                        : 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500'
                        }`}
                >
                    <div className={`w-2 h-2 rounded-full ${botMode === 'bot' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    {botMode === 'bot' ? 'BOT ACTIVE' : 'MANUAL MODE'}
                </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                {history.map((msg, idx) => {
                    const isBot = msg.from === 'bot';
                    const isOwner = msg.from === 'owner';
                    const isMe = isBot || isOwner;
                    return (
                        <div key={idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1
                        ${isBot ? 'bg-jewelry-gold text-black' : isOwner ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}>
                                {isBot ? 'AI' : isOwner ? 'ME' : 'C'}
                            </div>
                            <div className={`max-w-md p-3 rounded-2xl text-sm ${isMe ? 'bg-white/10 text-gray-200 rounded-tr-none' : 'bg-[#1a1a1a] border border-white/10 text-gray-300 rounded-tl-none'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <span className="block mt-1 text-[9px] opacity-50 text-right">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Action Area */}
            <div className="p-5 bg-[#121212] border-t border-white/5">
                {isEstimate && selectedItem.status === 'pending_approval' ? (
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 bg-[#0a0a0a] rounded-xl flex items-center px-4 py-3 border border-jewelry-gold/20">
                            <span className="text-jewelry-gold mr-2 font-serif text-lg">₹</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="bg-transparent outline-none w-full text-white"
                                placeholder="Final Price"
                            />
                        </div>
                        <button onClick={handleApprove} className="bg-jewelry-gold text-jewelry-dark px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                            <CheckCircle size={18} /> APPROVE
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4 items-center">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-jewelry-gold/50 transition-colors"
                            placeholder="Type a message to customer..."
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                        />
                        <button onClick={handleSendChat} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors">
                            <Send size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatArea;
