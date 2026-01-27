import { Save, AlertTriangle, DollarSign } from 'lucide-react';
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
        // Toast could go here
    };

    const isManualMode = settings.manualRates?.gold || settings.manualRates?.silver;

    return (
        <div className="space-y-6">
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

            <div className="space-y-4">
                {/* General */}
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Store Profile</h3>
                    <input
                        className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-sm outline-none transition-colors"
                        value={settings.storeLocation}
                        onChange={e => handleChange('storeLocation', e.target.value)}
                        placeholder="Google Maps Link"
                    />
                    <input
                        className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-sm outline-none transition-colors"
                        value={settings.ownerNumber}
                        onChange={e => handleChange('ownerNumber', e.target.value)}
                        placeholder="Owner WhatsApp (e.g. +91...)"
                    />
                </div>

                <div className="h-px bg-white/5 my-4"></div>

                {/* Rates */}
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <DollarSign className="text-[var(--gold-primary)]" />
                            Pricing Configuration
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm ${!settings.useManualRates ? 'text-[var(--gold-primary)] font-bold' : 'text-gray-500'}`}>Live API</span>
                            <button
                                type="button"
                                onClick={() => handleChange('useManualRates', !settings.useManualRates)}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.useManualRates ? 'bg-[var(--gold-primary)]' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.useManualRates ? 'left-7' : 'left-1'}`} />
                            </button>
                            <span className={`text-sm ${settings.useManualRates ? 'text-[var(--gold-primary)] font-bold' : 'text-gray-500'}`}>Manual</span>
                        </div>
                    </div>

                    <div className={`space-y-4 transition-opacity ${settings.useManualRates ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-500 mb-1 block">Approval Threshold (₹{settings.approvalThreshold})</label>
                            <input
                                type="range" min="5000" max="100000" step="1000"
                                className="w-full accent-[var(--gold-primary)] h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                                value={settings.approvalThreshold}
                                onChange={e => handleChange('approvalThreshold', parseInt(e.target.value))}
                            />
                        </div>
                        {['gold', 'silver', 'platinum'].map(metal => (
                            <div key={metal} className="relative">
                                <label className="absolute -top-2 left-2 text-[9px] bg-[var(--bg-panel)] px-1 text-[var(--gold-primary)] uppercase font-bold tracking-wider">{metal}</label>
                                <input
                                    className="w-full bg-[#050b11] border border-white/10 focus:border-[var(--gold-primary)] rounded-lg p-3 text-white text-right font-mono outline-none transition-colors"
                                    type="number"
                                    placeholder="Live"
                                    value={settings.manualRates?.[metal]}
                                    onChange={e => handleRateChange(metal, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-[var(--gold-primary)] hover:bg-[var(--gold-dim)] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Update Settings'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
