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
    const [saved, setSaved] = useState(false);

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
        setSaved(false);
        try {
            await fetch(`${API_URL}/api/dashboard/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            setTimeout(() => {
                setLoading(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }, 800);
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

            </div>

            {/* Floating Footer */}
            <div className="fixed bottom-0 right-0 w-[calc(100%-16rem)] bg-[var(--bg-main)]/95 backdrop-blur-md border-t border-[var(--border-dim)] p-4 flex justify-end gap-3 z-30">
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 rounded-lg border border-[var(--border-dim)] text-white font-medium hover:bg-white/5 transition-colors"
                >
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
            <div className={`fixed bottom-4 left-[18rem] flex items-center gap-2 text-[#10b981] text-xs font-medium transition-opacity duration-500 ${saved ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-[10px] text-black">✓</div>
                Settings saved successfully
            </div>
        </div>
    );
};

export default SettingsPage;
