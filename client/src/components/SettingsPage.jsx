import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, DollarSign, Percent } from 'lucide-react';
import { API_URL } from '../config';

const SettingsPage = () => {
    // 1. Initialize with SAFE Defaults
    const [settings, setSettings] = useState({
        storeLocation: '',
        ownerNumber: '',
        approvalThreshold: 20000,
        useManualRates: false,
        manualRates: { gold: '', silver: '', platinum: '' },
        wastage: { bridal: 0.25, daily: 0.15, investment: 0.05 }
    });
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        fetch(`${API_URL}/api/dashboard/settings`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load");
                return res.json();
            })
            .then(data => {
                // 2. Ultra-Safe Merge to prevent undefined crashes
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    manualRates: { ...prev.manualRates, ...(data.manualRates || {}) },
                    wastage: { ...prev.wastage, ...(data.wastage || {}) }
                }));
            })
            .catch(err => {
                console.error("Settings Load Error", err);
                setFetchError("Could not load settings. Using defaults.");
            });
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

    const handleWastageChange = (type, value) => {
        setSettings(prev => ({
            ...prev,
            wastage: { ...prev.wastage, [type]: parseFloat(value) }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await fetch(`${API_URL}/api/dashboard/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            // Show brief success state if needed
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const isManualMode = settings.manualRates?.gold || settings.manualRates?.silver;

    if (fetchError) {
        return <div className="p-4 text-red-500 bg-red-500/10 rounded-lg">{fetchError}</div>;
    }

    return (
        <div className="space-y-6 pb-20"> {/* Add padding bottom for scroll */}

            {/* Warning Banner */}
            {isManualMode && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="text-yellow-500" size={20} />
                    <div className="text-sm">
                        <span className="text-yellow-500 font-bold block">Manual Pricing Active</span>
                        <span className="text-gray-400">Live market rates are currently overridden.</span>
                    </div>
                </div>
            )}

            <div className="space-y-6">

                {/* 1. Store Profile */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Store Profile</h3>
                    <input
                        className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-sm outline-none transition-colors"
                        value={settings.storeLocation || ''}
                        onChange={e => handleChange('storeLocation', e.target.value)}
                        placeholder="Google Maps Link"
                    />
                    <input
                        className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-sm outline-none transition-colors"
                        value={settings.ownerNumber || ''}
                        onChange={e => handleChange('ownerNumber', e.target.value)}
                        placeholder="Owner WhatsApp (e.g. +91...)"
                    />
                </div>

                <div className="h-px bg-white/5"></div>

                {/* 2. Pricing Configuration */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign className="text-[var(--gold-primary)]" />
                            Pricing Model
                        </h3>
                        {/* Toggle */}
                        <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-full border border-white/5">
                            <button
                                type="button"
                                onClick={() => handleChange('useManualRates', false)}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${!settings.useManualRates ? 'bg-[var(--gold-primary)] text-black' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Live API
                            </button>
                            <button
                                type="button"
                                onClick={() => handleChange('useManualRates', true)}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${settings.useManualRates ? 'bg-[var(--gold-primary)] text-black' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    <div className={`space-y-4 transition-all duration-300 ${settings.useManualRates ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                        {['gold', 'silver', 'platinum'].map(metal => (
                            <div key={metal} className="relative">
                                <label className="absolute -top-2 left-2 text-[9px] bg-[var(--bg-panel)] px-1 text-[var(--gold-primary)] uppercase font-bold tracking-wider">{metal}</label>
                                <input
                                    className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-right font-mono outline-none transition-colors"
                                    type="number"
                                    placeholder="Rate/g"
                                    value={settings.manualRates?.[metal] || ''}
                                    onChange={e => handleRateChange(metal, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Wastage (Making Charges) */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                        <Percent className="text-[var(--gold-primary)]" />
                        Wastage / VA
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { id: 'bridal', label: 'Bridal', def: 0.25 },
                            { id: 'daily', label: 'Daily', def: 0.15 },
                            { id: 'investment', label: 'Coins', def: 0.05 }
                        ].map(type => (
                            <div key={type.id}>
                                <label className="text-xs text-gray-500 mb-1 block">{type.label}</label>
                                <div className="relative">
                                    <input
                                        type="number" step="0.01"
                                        className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white font-mono outline-none"
                                        value={settings.wastage?.[type.id] || type.def}
                                        onChange={e => handleWastageChange(type.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Values are decimals (e.g. 0.25 = 25%)</p>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-[var(--gold-primary)] hover:bg-[var(--gold-dim)] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Update Configuration'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
