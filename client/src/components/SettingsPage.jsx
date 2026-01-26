import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { API_URL } from '../config';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        storeLocation: '',
        ownerNumber: '',
        approvalThreshold: 20000,
        manualRates: { gold: '', silver: '', platinum: '' }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/dashboard/settings`)
            .then(res => res.json())
            .then(data => setSettings({ ...settings, ...data }));
    }, []);

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleRateChange = (metal, value) => {
        setSettings(prev => ({
            ...prev,
            manualRates: { ...prev.manualRates, [metal]: value }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        await fetch(`${API_URL}/api/dashboard/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        setLoading(false);
        alert('Settings Saved!');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-white">System Settings</h2>

            <div className="grid gap-6">
                {/* General Settings */}
                <div className="bg-[#121212] p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold mb-4 text-yellow-500">General Configuration</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Store Location</label>
                            <input
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                                value={settings.storeLocation}
                                onChange={e => handleChange('storeLocation', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Owner WhatsApp (Admin)</label>
                            <input
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                                value={settings.ownerNumber}
                                onChange={e => handleChange('ownerNumber', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">This number will have Admin commands access.</p>
                        </div>
                    </div>
                </div>

                {/* Automation Rules */}
                <div className="bg-[#121212] p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold mb-4 text-yellow-500">Automation Rules</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Approval Threshold (₹)</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min="5000" max="100000" step="1000"
                                className="flex-1 accent-yellow-500"
                                value={settings.approvalThreshold}
                                onChange={e => handleChange('approvalThreshold', parseInt(e.target.value))}
                            />
                            <span className="text-xl font-mono text-yellow-500">₹{settings.approvalThreshold}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Estimates below this value are auto-approved by AI.</p>
                    </div>
                </div>

                {/* Pricing Overrides */}
                <div className="bg-[#121212] p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold mb-4 text-yellow-500">Manual Pricing Overrides</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['gold', 'silver', 'platinum'].map(metal => (
                            <div key={metal}>
                                <label className="block text-sm text-gray-400 mb-1 capitalize">{metal} Rate</label>
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white"
                                    type="number"
                                    placeholder="Auto"
                                    value={settings.manualRates?.[metal]}
                                    onChange={e => handleRateChange(metal, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Leave empty to use Live Market Rates.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-yellow-500 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                >
                    <Save size={20} />
                    {loading ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
