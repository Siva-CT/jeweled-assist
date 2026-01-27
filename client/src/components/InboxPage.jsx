import React, { useState, useEffect } from 'react';
import { Search, Filter, Bell, Phone, Video, MoreVertical, Paperclip, Send, Check, CheckCheck, User, X, MessageSquare, Bot } from 'lucide-react';
import { API_URL } from '../config';

const InboxPage = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [filter, setFilter] = useState('All'); // All, Needs Action, Custom
    const [inputText, setInputText] = useState('');

    // Fetch conversations (Mock + API)
    useEffect(() => {
        const fetchInbox = async () => {
            try {
                const res = await fetch(`${API_URL}/api/dashboard/inbox`);
                const data = await res.json();

                // Transform data or stick to mock if empty
                if (data && data.length > 0) {
                    setConversations(data.map(d => ({
                        id: d.phone,
                        name: d.name,
                        lastMsg: d.lastIntent || "New inquiry received",
                        time: "2m ago", // Mock time for now
                        status: d.status === 'Needs Action' ? 'Needs Action' : 'Active',
                        unread: d.actionRequired ? 1 : 0,
                        type: d.intent || 'General',
                        phone: d.phone
                    })));
                } else {
                    // Fallback Mock Data as per Image
                    setConversations([
                        { id: 1, name: '+91 98765 43210', lastMsg: "I'm looking for a 2ct solitaire ring with a gold band...", time: '2m ago', status: 'Needs Action', type: 'Expert Advice', unread: 1 },
                        { id: 2, name: '+91 91234 56789', lastMsg: "Attached is the sketch for the bespoke necklace...", time: '15m ago', status: 'Needs Action', type: 'Custom Design', unread: 2 },
                        { id: 3, name: '+44 7700 900012', lastMsg: "Can I get a trade-in value for this vintage Patek?", time: '1h ago', status: 'Under Review', type: 'Valuation', unread: 0 },
                        { id: 4, name: '+1 212 555 0198', lastMsg: "Seeking a conflict-free pink diamond, pear cut...", time: '3h ago', status: 'Needs Action', type: 'Rare Stones', unread: 0 },
                    ]);
                }
            } catch (e) { console.error("Inbox Fetch Error", e); }
        };
        fetchInbox();
    }, []);

    const [botStatus, setBotStatus] = useState('agent'); // 'bot' | 'agent'
    const [isToggling, setIsToggling] = useState(false);

    // Fetch Bot Status when Chat Selected
    useEffect(() => {
        if (selectedChat?.phone) {
            // Default to 'agent' for inbox items (since they are handoffs), but verify
            setBotStatus('agent');
            fetch(`${API_URL}/api/dashboard/bot-status/${selectedChat.phone}`)
                .then(res => res.json())
                .then(data => setBotStatus(data.mode))
                .catch(err => console.error("Bot status fetch failed", err));
        }
    }, [selectedChat]);

    const handleToggleBot = async () => {
        if (!selectedChat || isToggling) return;
        setIsToggling(true);
        const newMode = botStatus === 'bot' ? 'agent' : 'bot';

        try {
            // Optimistic Update
            setBotStatus(newMode);

            await fetch(`${API_URL}/api/dashboard/toggle-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: selectedChat.phone, mode: newMode })
            });

            // If turning bot ON, maybe close the chat or refresh list?
            // For now, just show status change. The polling will eventually remove it from list.
        } catch (e) {
            console.error("Toggle failed", e);
            setBotStatus(botStatus); // Revert
        } finally {
            setIsToggling(false);
        }
    };

    const ChatMessage = ({ msg, isMe }) => (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[70%] rounded-2xl p-4 ${isMe ? 'bg-[#2563eb] text-white rounded-tr-sm' : 'bg-[#1b1d29] text-gray-200 border border-[var(--border-dim)] rounded-tl-sm'}`}>
                <p className="text-sm leading-relaxed">{msg}</p>
                <div className={`text-[10px] mt-2 flex items-center justify-end gap-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                    <span>10:42 AM</span>
                    {isMe && <CheckCheck size={12} />}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex bg-[var(--bg-main)] overflow-hidden font-['Inter']">
            {/* LEFT PANEL: Conversation List */}
            <div className="w-[400px] border-r border-[var(--border-dim)] flex flex-col bg-[var(--bg-sidebar)]">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-dim)]">
                    <h2 className="text-xl font-bold text-white mb-4">Handoffs Inbox</h2>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            className="w-full bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex gap-2">
                        {['All', 'Needs Action', 'Custom'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all
                                    ${filter === f
                                        ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                        : 'bg-transparent border-[var(--border-dim)] text-[var(--text-secondary)] hover:border-gray-600'
                                    }`}
                            >
                                {f === 'All' && <span className="mr-1 opacity-80">({conversations.length})</span>}
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => setSelectedChat(conv)}
                            className={`p-5 border-b border-[var(--border-dim)] cursor-pointer hover:bg-[var(--bg-card)] transition-colors
                                ${selectedChat?.id === conv.id ? 'bg-[var(--bg-card)] border-l-4 border-l-[var(--primary)]' : 'border-l-4 border-l-transparent'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-white text-sm">{conv.name}</h3>
                                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{conv.time}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase
                                    ${conv.status === 'Needs Action' ? 'bg-[#2563eb] text-white' : 'bg-gray-700 text-gray-300'}
                                `}>
                                    {conv.status.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">• {conv.type}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed italic">
                                "{conv.lastMsg}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT PANEL: Chat Area */}
            {selectedChat ? (
                <div className="flex-1 flex flex-col bg-[var(--bg-main)]">
                    {/* Chat Header */}
                    <div className="h-20 border-b border-[var(--border-dim)] flex items-center justify-between px-8 bg-[var(--bg-sidebar)]">
                        <div>
                            <h3 className="text-lg font-bold text-white">{selectedChat.name}</h3>
                            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${botStatus === 'bot' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                {botStatus === 'bot' ? 'Bot Handling' : 'Agent Active'}
                            </p>
                        </div>
                        <div className="flex gap-4 items-center">
                            {/* Bot Toggle Switch */}
                            <button
                                onClick={handleToggleBot}
                                disabled={isToggling}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all border
                                    ${botStatus === 'bot'
                                        ? 'bg-green-900/20 text-green-400 border-green-500/30 hover:bg-green-900/30'
                                        : 'bg-blue-900/20 text-blue-400 border-blue-500/30 hover:bg-blue-900/30'
                                    }`}
                            >
                                {botStatus === 'bot' ? (
                                    <>
                                        <Bot size={16} /> Bot Active
                                    </>
                                ) : (
                                    <>
                                        <User size={16} /> User Agent
                                    </>
                                )}
                            </button>

                            <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-[var(--bg-card)] rounded-lg text-[var(--text-secondary)] hover:text-white transition-colors ml-2">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--bg-main)] relative">
                        {/* Placeholder Diamond Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                            backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}></div>

                        {/* Date Divider */}
                        <div className="flex justify-center mb-6">
                            <span className="bg-[var(--bg-card)] text-[var(--text-muted)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-[var(--border-dim)]">Today</span>
                        </div>

                        {/* Bot Handoff Event (Conditional) */}
                        {botStatus === 'agent' && (
                            <div className="flex justify-center mb-6">
                                <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    AI Agent handed off this conversation. Reason: <strong>{selectedChat.type}</strong>
                                </div>
                            </div>
                        )}

                        {/* Bot Active Event (Conditional) */}
                        {botStatus === 'bot' && (
                            <div className="flex justify-center mb-6">
                                <div className="bg-green-900/20 border border-green-500/30 text-green-400 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    Bot is currently managing this conversation.
                                </div>
                            </div>
                        )}

                        <ChatMessage msg="Hi there! I was browsing your collection and saw the solitaire rings." isMe={false} />
                        <ChatMessage msg="I'm specifically looking for something around 2 carats, preferably with a classic gold band. Do you have options?" isMe={false} />

                        {/* Mock Reply Input */}
                    </div>

                    {/* Input Area */}
                    <div className={`p-6 bg-[var(--bg-sidebar)] border-t border-[var(--border-dim)] transition-opacity ${botStatus === 'bot' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                        <div className="relative">
                            <div className="absolute left-2 top-2 flex gap-1">
                                <button className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] rounded-lg transition-colors"><Paperclip size={18} /></button>
                            </div>
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={botStatus === 'bot' ? "Bot is active. Toggle to Agent to reply." : "Type your reply..."}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl py-3 pl-12 pr-14 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors h-12"
                            />
                            <button className="absolute right-2 top-2 p-2 bg-[var(--primary)] hover:bg-[var(--primary-dim)] text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                                <Send size={16} />
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-3 px-1">
                            <p className="text-[10px] text-[var(--text-muted)]">Press <strong>Enter</strong> to send</p>
                            <button className="text-[10px] text-[var(--gold)] font-bold hover:underline">View CRM Profile →</button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty State (Right Panel) */
                <div className="flex-1 bg-[var(--bg-main)] flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
                    {/* Big Diamond Icon Glow */}
                    <div className="w-32 h-32 bg-[var(--bg-card)] rounded-3xl flex items-center justify-center mb-6 relative z-10 border border-[var(--border-dim)] shadow-2xl rotate-45 transform">
                        <MessageSquare className="text-[var(--primary)] -rotate-45" size={48} fill="currentColor" fillOpacity={0.1} />
                    </div>

                    <h2 className="text-2xl font-bold text-white z-10 mt-4">Select a Conversation</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-sm z-10">
                        Pick an AI handoff from the queue to view context, client history, and take action.
                    </p>

                    <div className="mt-8 z-10">
                        <button className="px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-dim)] hover:border-[var(--primary)] text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2">
                            <User size={16} /> Assign to Me
                        </button>
                    </div>

                    {/* Texture */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>
            )}

            {/* FAR RIGHT: Context Panel (Only if chat selected) - Optional based on full width, but mockup shows one */}
            {selectedChat && (
                <div className="w-[300px] border-l border-[var(--border-dim)] bg-[var(--bg-sidebar)] p-6 hidden xl:block">
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-6">Context Panel</h4>

                    {/* CRM Card */}
                    <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-dim)] text-center mb-6">
                        <div className="w-12 h-12 bg-gray-700/50 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
                            {selectedChat.name.charAt(0)}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">CRM Profile</p>
                        <p className="text-xs text-[var(--text-muted)]">No customer selected to show CRM profile</p>
                    </div>

                    {/* Related */}
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-4">Related Items</h4>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="aspect-square bg-[var(--bg-card)] rounded-lg border border-[var(--border-dim)] flex items-center justify-center">
                            <Video size={20} className="text-gray-700" />
                        </div>
                        <div className="aspect-square bg-[var(--bg-card)] rounded-lg border border-[var(--border-dim)] flex items-center justify-center">
                            <Paperclip size={20} className="text-gray-700" />
                        </div>
                    </div>

                    <button className="w-full py-3 bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg text-xs font-bold text-white hover:bg-[var(--bg-card-hover)] transition-colors">
                        Assign to Me
                    </button>
                </div>
            )}
        </div>
    );
};

export default InboxPage;
