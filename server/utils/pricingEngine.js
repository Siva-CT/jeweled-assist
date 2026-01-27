const path = require('path');
const db = require('../db');

let cachedRates = { gold_gram_inr: 7650, silver_gram_inr: 92, platinum_gram_inr: 3500 };
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000;

function getLiveRates() {
    return new Promise((resolve) => {
        const now = Date.now();

        // Check for Manual Override FIRST (Hot-switch logic)
        // If manual mode is ON, we don't even need to call Python if we want to be super efficient, 
        // but we might want the live rate as fallback or for reference. 
        // For now, we fetch live, then override.

        if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
            return resolve(applyManualOverrides(cachedRates));
        }

        // FAILSAFE: Force resolve after 3 seconds if Python hangs
        const timeout = setTimeout(() => {
            console.error("⚠️ Pricing Engine Timeout - Using Fallback");
            resolve(cachedRates || { gold_gram_inr: 7650, silver_gram_inr: 92, platinum_gram_inr: 3500, status: 'fallback_timeout' });
        }, 3000);

        const pythonScript = path.join(__dirname, 'fetch_rates.py');
        const pythonProcess = spawn('python', [pythonScript]);
        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Logic Error: ${data}`);
        });

        pythonProcess.on('error', (err) => {
            clearTimeout(timeout);
            console.error("❌ Failed to spawn Python:", err.message);
            // FALLBACK RATES (Approx Jan 2026)
            resolve(cachedRates || { gold_gram_inr: 7650, silver_gram_inr: 92, platinum_gram_inr: 3500, status: 'fallback_error' });
        });

        pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return resolve(cachedRates || { gold_gram_inr: 7650, silver_gram_inr: 92, platinum_gram_inr: 3500, status: 'fallback_exit' });
            }
            try {
                let result = JSON.parse(dataString);

                // VALIDATION: Ensure no zeros
                if (!result.gold_gram_inr) result.gold_gram_inr = 7650;
                if (!result.silver_gram_inr) result.silver_gram_inr = 92;
                if (!result.platinum_gram_inr) result.platinum_gram_inr = 3500;

                cachedRates = result;
                lastFetchTime = now;

                resolve(applyManualOverrides(result));
            } catch (e) {
                console.error("JSON Parse Error:", e);
                resolve(applyManualOverrides(cachedRates));
            }
        });
    });
}

function applyManualOverrides(rates) {
    const finalRates = { ...rates }; // Copy
    const settings = db.settings;

    if (settings?.useManualRates && settings.manualRates) {
        if (settings.manualRates.gold > 0) finalRates.gold_gram_inr = parseFloat(settings.manualRates.gold);
        if (settings.manualRates.silver > 0) finalRates.silver_gram_inr = parseFloat(settings.manualRates.silver);
        if (settings.manualRates.platinum > 0) finalRates.platinum_gram_inr = parseFloat(settings.manualRates.platinum);
        finalRates.isManual = true; // Flag for UI
    }
    return finalRates;
}

async function calculatePrice(metal, weight, makingCharges = 0.15, gst = 0.03) {
    const rates = await getLiveRates();
    let rate = 0;

    // Normalize rate based on metal
    if (metal.toLowerCase().includes('gold')) {
        rate = rates.gold_gram_inr; // Default 22k
    } else if (metal.toLowerCase().includes('silver')) {
        rate = rates.silver_gram_inr;
    } else if (metal.toLowerCase().includes('platinum')) {
        rate = rates.platinum_gram_inr || 3500; // Fallback
    }

    if (!rate || isNaN(rate)) rate = 7000; // Safety Fallback

    const basePrice = rate * weight;
    const withMaking = basePrice * (1 + makingCharges);
    const finalPrice = withMaking * (1 + gst);

    return {
        rate,
        makingChargesPct: makingCharges * 100,
        gstPct: gst * 100,
        finalPrice: Math.round(finalPrice)
    };
}

module.exports = { getLiveRates, calculatePrice };
