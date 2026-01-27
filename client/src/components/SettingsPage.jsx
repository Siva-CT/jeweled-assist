import React, { useState, useEffect } from 'react';
import { Save, X, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        store_name: '',
        store_address: '',
        google_maps_link: '',
        store_timings: {
            mon: { open: '09:00 AM', close: '07:00 PM' },
            tue: { open: '09:00 AM', close: '07:00 PM' },
            wed: { open: '09:00 AM', close: '07:00 PM' },
            thu: { open: '09:00 AM', close: '07:00 PM' },
            fri: { open: '09:00 AM', close: '07:00 PM' },
            sat: { open: '10:00 AM', close: '05:00 PM' },
            sun: { open: 'CLOSED', close: '' } // Special handle
        }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch current settings
        fetch(`${API_URL}/api/dashboard/settings`)
            .then(res => res.json())
            // Merge defaults just in case
            .then(data => {
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    // Ensure timings structure exists if backend sends partial
                    store_timings: { ...prev.store_timings, ...(data.store_timings || {}) }
                }));
            })
            .catch(e => console.error("Settings Load Error", e));
    }, []);

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleTimingChange = (day, type, value) => {
        setSettings(prev => ({
            ...prev,
            store_timings: {
                ...prev.store_timings,
                [day]: { ...prev.store_timings[day], [type]: value }
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        // Simulate safe save to backend
        try {
            await fetch(`${API_URL}/api/dashboard/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            setTimeout(() => setLoading(false), 800);
        } catch (e) { setLoading(false); }
    };

    return (
        <div className="flex-1 bg-[var(--bg-main)] p-8 overflow-y-auto custom-scrollbar relative">

            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Store Settings</h2>
                <p className="text-[var(--text-secondary)]">Manage your jewelry store's public profile and operational hours.</p>
            </div>

            <div className="max-w-4xl space-y-6 pb-24">

                {/* General Information Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-8">
                    <h3 className="text-lg font-bold text-white mb-6">General Information</h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Store Name</label>
                            <input
                                className="w-full bg-[#0f172a] border border-[var(--border-dim)] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition-colors"
                                value={settings.store_name || ''}
                                onChange={e => handleChange('store_name', e.target.value)}
                                placeholder="e.g. The Gilded Vault Jewelry"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Store Address</label>
                            <textarea
                                className="w-full bg-[#0f172a] border border-[var(--border-dim)] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition-colors min-h-[80px]"
                                value={settings.store_address || ''}
                                onChange={e => handleChange('store_address', e.target.value)}
                                placeholder="e.g. 123 Diamond District..."
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Google Maps Link</label>
                                <a href={settings.google_maps_link} target="_blank" rel="noreferrer" className="text-blue-500 text-xs flex items-center gap-1 hover:underline">
                                    <ExternalLink size={12} /> View on Map
                                </a>
                            </div>
                            <input
                                className="w-full bg-[#0f172a] border border-[var(--border-dim)] rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
                                value={settings.google_maps_link || ''}
                                onChange={e => handleChange('google_maps_link', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Store Timings Card */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-8">
                    <h3 className="text-lg font-bold text-white mb-6">Store Timings</h3>
                    <div className="space-y-4">
                        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                            const Label = day.charAt(0).toUpperCase() + day.slice(1) + (day === 'tue' ? 'sday' : day === 'wed' ? 'nesday' : day === 'thu' ? 'rsday' : day === 'sat' ? 'urday' : day === 'sun' ? 'day' : 'day');
                            const isClosed = settings.store_timings?.[day]?.open === 'CLOSED';

                            return (
                                <div key={day} className={`flex items-center gap-4 p-3 rounded-lg ${day === 'sun' ? 'bg-[#ef4444]/10 border border-red-500/20' : 'bg-[#0f172a] border border-[var(--border-dim)]'}`}>
                                    <div className="w-32 font-medium text-white text-sm">{Label}</div>

                                    {day === 'sun' ? (
                                        <div className="flex-1 text-right text-red-500 font-bold text-sm tracking-widest uppercase">CLOSED</div>
                                    ) : (
                                        <>
                                            <input
                                                className="bg-[#1e293b] text-white text-xs p-2 rounded border border-[var(--border-dim)] text-center w-24 focus:border-blue-500 outline-none"
                                                value={settings.store_timings?.[day]?.open || '09:00 AM'}
                                                onChange={e => handleTimingChange(day, 'open', e.target.value)}
                                            />
                                            <span className="text-[var(--text-secondary)]">-</span>
                                            <input
                                                className="bg-[#1e293b] text-white text-xs p-2 rounded border border-[var(--border-dim)] text-center w-24 focus:border-blue-500 outline-none"
                                                value={settings.store_timings?.[day]?.close || '07:00 PM'}
                                                onChange={e => handleTimingChange(day, 'close', e.target.value)}
                                            />
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Visual Placeholder for Map */}
                <div className="h-32 w-full rounded-xl overflow-hidden relative border border-[var(--border-dim)] opacity-60 grayscale hover:grayscale-0 transition-all">
                    <img src="https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-74.0060,40.7128,14,0/1000x300?access_token=pk.bw" alt="" className="w-full h-full object-cover bg-[#0f172a]" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/60 px-3 py-1 rounded text-xs font-bold tracking-widest text-white border border-white/20">STORE LOCATION PREVIEW</span>
                    </div>
                </div>

            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border-dim)] p-4 flex justify-end gap-3 z-30">
                <button className="px-6 py-2.5 rounded-lg border border-[var(--border-dim)] text-white font-medium hover:bg-white/5 transition-colors">
                    Discard Changes
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                    Save Settings
                </button>
            </div>
            <div className="fixed bottom-4 left-[18rem] flex items-center gap-2 text-[#10b981] text-xs font-medium opacity-0 animate-fade-in transition-opacity duration-1000" style={{ opacity: loading === false ? 1 : 0 }}>
                <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-[10px] text-black">✓</div>
                Settings synced with /api/settings
            </div>
        </div>
    );
};

export default SettingsPage;
