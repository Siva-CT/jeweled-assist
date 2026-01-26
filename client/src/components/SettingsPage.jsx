import React, { useState, useEffect } from 'react';
import { Save, MapPin, Phone } from 'lucide-react';
import { API_URL } from '../config';

const SettingsPage = () => {
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [threshold, setThreshold] = useState(20000);
    const [rates, setRates] = useState({ gold: '', silver: '', platinum: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch current settings
        fetch(`${API_URL}/api/dashboard/settings`)
            .then(res => res.json())
            .then(data => {
                setLocation(data.storeLocation);
                setPhone(data.ownerNumber);
                if (data.approvalThreshold) setThreshold(data.approvalThreshold);
                if (data.manualRates) setRates(data.manualRates);
            });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        await fetch(`${API_URL}/api/dashboard/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storeLocation: location,
                ownerNumber: phone,
                approvalThreshold: threshold,
                manualRates: rates
            })
        });
        setLoading(false);
        alert("Settings Updated!");
    };

    return (
        <div className="flex-1 p-8 bg-[#0a0a0a] text-gray-200">
            <h1 className="text-3xl font-serif text-jewelry-gold mb-8">Store Configuration</h1>

            <div className="max-w-xl space-y-6">
                <div className="bg-[#121212] p-6 rounded-xl border border-jewelry-gold/10">
                    <label className="block text-sm text-gray-500 mb-2 uppercase tracking-wider">Store Location Address</label>
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 p-3">
                        <MapPin className="text-jewelry-gold mr-3" />
                        <input
                            type="text"
                            className="bg-transparent w-full outline-none text-white"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">This address is sent to customers on WhatsApp.</p>
                </div>

                <div className="bg-[#121212] p-6 rounded-xl border border-jewelry-gold/10">
                    <label className="block text-sm text-gray-500 mb-2 uppercase tracking-wider">Owner WhatsApp Number</label>
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 p-3">
                        <Phone className="text-jewelry-gold mr-3" />
                        <input
                            type="text"
                            className="bg-transparent w-full outline-none text-white"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-[#121212] p-6 rounded-xl border border-jewelry-gold/10">
                    <label className="block text-sm text-gray-500 mb-4 uppercase tracking-wider">Manual Daily Rates (Override API)</label>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <span className="text-xs text-jewelry-gold block mb-1">Gold (₹/g)</span>
                            <input
                                type="number"
                                className="bg-black/40 w-full outline-none text-white p-2 rounded border border-white/5 focus:border-jewelry-gold/50"
                                value={rates.gold}
                                onChange={e => setRates({ ...rates, gold: e.target.value })}
                                placeholder="Auto"
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block mb-1">Silver (₹/g)</span>
                            <input
                                type="number"
                                className="bg-black/40 w-full outline-none text-white p-2 rounded border border-white/5 focus:border-jewelry-gold/50"
                                value={rates.silver}
                                onChange={e => setRates({ ...rates, silver: e.target.value })}
                                placeholder="Auto"
                            />
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block mb-1">Platinum (₹/g)</span>
                            <input
                                type="number"
                                className="bg-black/40 w-full outline-none text-white p-2 rounded border border-white/5 focus:border-jewelry-gold/50"
                                value={rates.platinum}
                                onChange={e => setRates({ ...rates, platinum: e.target.value })}
                                placeholder="Auto"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Set to 0 to use Live API rates.</p>
                </div>

                <button
                    onClick={handleSave}
                    className="bg-jewelry-gold text-jewelry-dark px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white transition-colors"
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Update Configuration'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
