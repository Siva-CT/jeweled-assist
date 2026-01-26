import React, { useState, useEffect } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { API_URL } from '../config';

const ChatArea = ({ selectedItem, onApprove }) => {
    const [price, setPrice] = useState(selectedItem?.estimatedCost || '');
    const [chatInput, setChatInput] = useState('');
    const [history, setHistory] = useState([]);
    const [botMode, setBotMode] = useState('bot');

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

    if (!selectedItem) return <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center text-gray-500">Select an item</div>;

    const isEstimate = selectedItem.type === 'estimate' && selectedItem.status === 'pending_approval';

    return (
        <div className="flex-1 flex flex-col bg-[#0a0a0a] h-full relative">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#121212]">
                <div>
                    <h2 className="font-bold text-white">{selectedItem.customer}</h2>
                    <p className="text-sm text-yellow-500">{selectedItem.type}</p>
                </div>
                <button onClick={toggleBot} className={`px-4 py-2 rounded-full text-xs font-bold border ${botMode === 'bot' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                    {botMode === 'bot' ? 'BOT ACTIVE' : 'MANUAL MODE'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${['bot', 'owner'].includes(msg.from) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-xl ${['bot', 'owner'].includes(msg.from) ? 'bg-white/10 text-white' : 'bg-[#222] text-gray-300'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-[#121212] border-t border-white/10">
                {isEstimate ? (
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black rounded-lg border border-white/10 flex items-center px-3">
                            <span className="text-yellow-500 mr-2">₹</span>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-transparent w-full text-white outline-none py-2" />
                        </div>
                        <button onClick={() => onApprove(selectedItem.id, price)} className="bg-yellow-500 text-black px-6 rounded-lg font-bold flex items-center gap-2">
                            <CheckCircle size={18} /> APPROVE
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white" placeholder="Type message..." />
                        <button onClick={handleSendChat} className="bg-blue-600 p-2 rounded-lg text-white"><Send size={20} /></button>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ChatArea;
