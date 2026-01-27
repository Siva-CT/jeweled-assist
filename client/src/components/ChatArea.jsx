import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, Paperclip, X } from 'lucide-react';
import { API_URL } from '../config';

const ChatArea = ({ selectedItem, onApprove }) => {
    const [price, setPrice] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [history, setHistory] = useState([]);
    const [botMode, setBotMode] = useState('bot');
    const bottomRef = useRef(null);

    // Sync local state when selection changes
    useEffect(() => {
        if (selectedItem) {
            setPrice(selectedItem.estimatedCost || '');
        }
    }, [selectedItem]);

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
        } else {
            setHistory([]);
        }
    }, [selectedItem]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const toggleBot = async () => {
        const newMode = botMode === 'bot' ? 'agent' : 'bot';
        await fetch(`${API_URL}/api/dashboard/toggle-bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: selectedItem.customer, mode: newMode })
        });
        setBotMode(newMode);
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        await fetch(`${API_URL}/api/dashboard/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: selectedItem.customer, text: chatInput })
        });
        setChatInput('');
        // Optimistic append
        setHistory(prev => [...prev, { from: 'owner', text: chatInput, timestamp: new Date() }]);
    };

    if (!selectedItem) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-[#060e16]">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <span className="text-4xl grayscale">💎</span>
                </div>
                <h3 className="text-xl font-medium text-gray-400">Welcome to Jeweled Assist</h3>
                <p className="text-sm text-gray-600 mt-2">Select a conversation from the left to start.</p>
            </div>
        );
    }

    const isEstimate = selectedItem.type === 'estimate' && selectedItem.status === 'pending_approval';
    const isHumanMode = botMode === 'agent';

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[var(--bg-deep)] shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center text-sm font-bold border border-white/5">
                        {selectedItem.customer.slice(-2)}
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-base">{selectedItem.customer}</h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${botMode === 'bot' ? 'bg-[var(--status-bot)]' : 'bg-[var(--status-human)]'}`}></div>
                            <span className="text-xs text-gray-400 uppercase tracking-widest">{botMode === 'bot' ? 'Bot Active' : 'Human Takeover'}</span>
                        </div>
                    </div>
                </div>

                {/* Takeover Toggle Pill */}
                <button
                    onClick={toggleBot}
                    className={`
                        relative px-1 py-1 w-[140px] h-[40px] rounded-full flex items-center transition-all duration-300 border
                        ${botMode === 'bot' ? 'bg-[#0f291e] border-green-900' : 'bg-[#290f0f] border-red-900'}
                    `}
                >
                    <div className={`absolute left-1 w-[68px] h-[30px] rounded-full transition-all duration-300 flex items-center justify-center text-[10px] font-bold shadow-lg z-10
                         ${botMode === 'bot' ? 'bg-[var(--status-bot)] text-black translate-x-0' : 'bg-[var(--status-human)] text-white translate-x-[68px]'}
                    `}>
                        {botMode === 'bot' ? 'BOT' : 'HUMAN'}
                    </div>
                    <span className={`w-1/2 text-center text-[10px] uppercase font-bold text-gray-500 ${botMode === 'bot' ? 'opacity-0' : 'opacity-100'}`}>Bot</span>
                    <span className={`w-1/2 text-center text-[10px] uppercase font-bold text-gray-500 ${botMode === 'agent' ? 'opacity-0' : 'opacity-100'}`}>Human</span>
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--bg-deep)]">
                {/* Security/Intro Banner */}
                <div className="flex justify-center my-4">
                    <span className="text-[10px] bg-white/5 text-gray-500 px-3 py-1 rounded-full uppercase tracking-wider">
                        End-to-End Encrypted
                    </span>
                </div>

                {history.map((msg, i) => {
                    const isBot = msg.from === 'bot';
                    const isOwner = msg.from === 'owner';
                    const isUser = !isBot && !isOwner;

                    return (
                        <div key={i} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                            <div className={`
                                max-w-[70%] p-4 rounded-2xl relative text-sm leading-relaxed shadow-sm
                                ${isUser
                                    ? 'bg-[#1E293B] text-gray-200 rounded-bl-sm'
                                    : isOwner
                                        ? 'bg-[#4c3a10] text-[var(--gold-primary)] border border-[var(--gold-dim)]/30 rounded-br-sm' // Owner: Darker Gold
                                        : 'bg-[#111] text-gray-400 border border-white/5 rounded-br-sm' // Bot: Neutral Dark
                                }
                            `}>
                                {isOwner && <span className="absolute -top-3 right-2 text-[9px] bg-[#4c3a10] px-1 rounded text-[var(--gold-primary)] border border-[var(--gold-dim)]/30">YOU</span>}
                                {isBot && <span className="absolute -top-3 right-2 text-[9px] bg-[#111] text-gray-500 px-1 rounded border border-white/5">AI AGENT</span>}
                                {msg.text}
                                <div className="text-[9px] opacity-40 mt-2 text-right">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[var(--bg-panel)] border-t border-white/5">
                {isEstimate ? (
                    <div className="bg-[#1a1500] border border-[var(--gold-dim)]/30 p-4 rounded-xl flex items-center justify-between animate-pulse-slow">
                        <div>
                            <div className="text-[var(--gold-primary)] font-bold text-sm mb-1">APPROVAL REQUIRED</div>
                            <div className="text-gray-400 text-xs">Customer is waiting for estimate</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-black/40 rounded-lg px-3 py-2 border border-white/5">
                                <span className="text-[var(--gold-primary)] mr-2">₹</span>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    className="bg-transparent w-24 text-white outline-none font-mono"
                                />
                            </div>
                            <button
                                onClick={() => onApprove(selectedItem.id, price)}
                                className="bg-[var(--gold-primary)] hover:bg-[var(--gold-dim)] text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
                            >
                                <CheckCircle size={16} /> Approve
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {!isHumanMode && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl border border-white/5">
                                <div className="flex gap-2">
                                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs transition-colors border border-white/5">
                                        Send Location 📍
                                    </button>
                                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs transition-colors border border-white/5">
                                        Trigger Nudge 👋
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 items-end bg-[#050b11] p-2 rounded-xl border border-white/10 focus-within:border-[var(--gold-dim)]/50 transition-colors">
                            <button className="p-2 text-gray-500 hover:text-[var(--gold-primary)] transition-colors"><Paperclip size={20} /></button>
                            <textarea
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                                className="flex-1 bg-transparent text-white text-sm outline-none resize-none pt-2 max-h-32 custom-scrollbar"
                                placeholder={isHumanMode ? "Type a message..." : "Switch to manual mode to chat..."}
                                rows={1}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || !isHumanMode}
                                className={`p-2 rounded-lg transition-all ${chatInput.trim() && isHumanMode ? 'bg-[var(--gold-primary)] text-black' : 'bg-white/5 text-gray-600'}`}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatArea;
