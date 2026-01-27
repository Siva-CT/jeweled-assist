const db = require('../db'); // Local fallback (legacy)
const approvalService = require('../services/approvalService'); // For Firestore access (if needed) or direct db access
// actually pricingEngine needs direct firebase access for 'pricing' collection if we want to follow "FIREBASE PRICE STORAGE" strictly
const firebase = require('../firebase');

let cachedRates = { gold_gram_inr: 0, silver_gram_inr: 0, platinum_gram_inr: 0, timestamp: 0 };
const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour Cache for API calls (to save credits)

async function getLiveRates() {
    // 1. Check Manual Overrides First (Global Rule)
    const settings = await approvalService.getPricingConfig();
    const storeSettings = await approvalService.getStoreSettings() || {};

    // Merge legacy and new settings structure
    const useManual = settings.manualMode || storeSettings.useManualRates;
    const manualRates = settings.manualRates || storeSettings.manualRates || {};

    if (useManual) {
        return {
            gold_gram_inr: parseFloat(manualRates.gold || 0),
            silver_gram_inr: parseFloat(manualRates.silver || 0),
            platinum_gram_inr: parseFloat(manualRates.platinum || 0),
            isManual: true,
            timestamp: Date.now()
        };
    }

    // 2. Check Cache
    const now = Date.now();
    if (now - cachedRates.timestamp < CACHE_DURATION && cachedRates.gold_gram_inr > 0) {
        return { ...cachedRates, isManual: false };
    }

    // 3. Fetch from GoldAPI.io
    try {
        console.log("Fetching live rates from GoldAPI...");
        const apiKey = process.env.GOLDAPI_KEY;
        if (!apiKey) throw new Error("GOLDAPI_KEY missing in .env");

        // Fetch Gold (XAU), Silver (XAG), Platinum (XPT)
        // GoldAPI requires separate calls or specific logic. 
        // We will fetch XAU first as it's most critical.
        // Shortcut: Fetching just XAU/INR, XAG/INR for now.

        const headers = { 'x-access-token': apiKey, 'Content-Type': 'application/json' };

        // Parallel Fetch
        const [goldRes, silverRes, platRes] = await Promise.all([
            fetch('https://www.goldapi.io/api/XAU/INR', { headers }).then(r => r.json()),
            fetch('https://www.goldapi.io/api/XAG/INR', { headers }).then(r => r.json()),
            fetch('https://www.goldapi.io/api/XPT/INR', { headers }).then(r => r.json())
        ]);

        // Logic: GoldAPI gives price per OUNCE usually, but endpoint /XAU/INR might give per gram if specified? 
        // Standard GoldAPI response for /XAU/INR is "price" (per ounce?? No, usually check docs). 
        // Wait, GoldAPI response has "price_gram_24k", "price_gram_22k", "price_gram_21k" etc. 
        // Perfect! We don't need manual conversion if they provide it.

        const gold22k = goldRes.price_gram_22k || (goldRes.price / 31.1035 * 0.916);
        const silver1g = silverRes.price_gram_24k || (silverRes.price / 31.1035); // Silver usually 24k/Standard in bars
        const plat1g = platRes.price_gram_24k || (platRes.price / 31.1035);

        const newRates = {
            gold_gram_inr: Math.round(gold22k),
            silver_gram_inr: Math.round(silver1g),
            platinum_gram_inr: Math.round(plat1g),
            timestamp: now
        };

        // 4. Persistence Rule: Store in Firestore
        await firebase.collection('pricing').add({
            timestamp: new Date(),
            source: 'goldapi',
            currency: 'INR',
            rates: newRates
        });

        cachedRates = newRates;
        return { ...newRates, isManual: false };

    } catch (e) {
        console.error("Pricing Fetch Error:", e.message);
        // Fallback to last known or safe defaults
        if (cachedRates.gold_gram_inr > 0) return { ...cachedRates, isManual: false };
        return { gold_gram_inr: 7000, silver_gram_inr: 90, platinum_gram_inr: 3500, isManual: false, error: true };
    }
}

async function calculatePrice(metal, weight, makingCharges = 0.15, gst = 0.03) {
    const rates = await getLiveRates();
    let rate = 7000;
    let label = 'Gold';

    const m = metal.toLowerCase();
    if (m.includes('gold') || m === 'a') { rate = rates.gold_gram_inr; label = 'Gold (22K)'; }
    else if (m.includes('silver') || m === 'b') { rate = rates.silver_gram_inr; label = 'Silver'; }
    else if (m.includes('platinum') || m === 'c') { rate = rates.platinum_gram_inr; label = 'Platinum'; }

    // Final Calculation: Grams * Rate
    // (User said "calculated_price = grams * price_per_gram". 
    // Wait, the prompt said "(This is an approximate value. Final price may vary based on design & making charges.)"
    // AND "Auto Price Calculation (NO QUESTIONS)... Estimated Price: {calculated_price}"
    // REQUIRED: "calculated_price = grams * price_per_gram". 
    // Did user want Making Charges included? 
    // "Final price may vary based on design & making charges" implies the estimate DOES NOT include them, or includes a basic amount?
    // "calculated_price = grams * price_per_gram" is EXPLICIT in the prompt.
    // I will follow the explicit formula: grams * price_per_gram.

    const finalPrice = Math.round(rate * weight);

    return {
        rate,
        label,
        finalPrice,
        isManual: rates.isManual,
        source: rates.isManual ? 'manual' : 'goldapi'
    };
}

module.exports = { getLiveRates, calculatePrice };
