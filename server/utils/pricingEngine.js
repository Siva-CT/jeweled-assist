const { spawn } = require('child_process');
const path = require('path');

// Simple in-memory cache
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute (as per demo requirements)

function getLiveRates() {
    return new Promise((resolve, reject) => {
        // Check Cache
        const now = Date.now();
        if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
            return resolve(cachedRates);
        }

        const pythonScript = path.join(__dirname, 'fetch_rates.py');
        const pythonProcess = spawn('python', [pythonScript]);

        let dataString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Logic Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                // Fallback if Python fails (e.g. strict environment)
                console.error(`Python process exited with code ${code}`);
                return resolve(cachedRates || { gold_gram_inr: 6500, status: 'fallback' });
            }

            try {
                const result = JSON.parse(dataString);

                // --- MANUAL OVERRIDE CHECK ---
                const db = require('../db'); // delayed import to avoid circular dep issues if any
                if (db.settings.manualRates) {
                    const m = db.settings.manualRates;
                    if (m.gold > 0) result.gold_gram_inr = parseFloat(m.gold);
                    if (m.silver > 0) result.silver_gram_inr = parseFloat(m.silver);
                    // Platinum isn't in default response, but we can add it
                    if (m.platinum > 0) result.platinum_gram_inr = parseFloat(m.platinum);
                }

                if (result.status === 'success') {
                    // FALLBACK: If API returns 0/NaN (market closed), use realistic defaults ONLY IF manual not set
                    if ((!result.gold_gram_inr || result.gold_gram_inr < 1000) && (!db.settings.manualRates?.gold)) {
                        result.gold_gram_inr = 15596; // Updated as per user screenshot
                        result.silver_gram_inr = 124; // Scaled roughly
                        result.usd_inr = 84;
                        result.status = 'fallback_live_failed';
                    }
                    cachedRates = result;
                    lastFetchTime = now;
                    resolve(result);
                } else {
                    console.error("Python Script Error:", result.message);
                    resolve(cachedRates || { gold_gram_inr: 6500, status: 'fallback_error' });
                }
            } catch (e) {
                console.error("JSON Parse Error:", e);
                resolve(cachedRates || { gold_gram_inr: 6500, status: 'fallback_parse' });
            }
        });
    });
}

/**
 * Calculates final jewelry price
 * @param {number} weight - Weight in grams
 * @param {number} makingCharges - Percentage (e.g. 0.15 for 15%)
 * @param {number} gst - Percentage (e.g. 0.03 for 3%)
 */
async function calculatePrice(weight, makingCharges = 0.15, gst = 0.03) {
    const rates = await getLiveRates();
    const basePrice = rates.gold_gram_inr * weight;
    const withMaking = basePrice * (1 + makingCharges);
    const finalPrice = withMaking * (1 + gst);

    return {
        rates,
        breakdown: {
            base: Math.round(basePrice),
            making: Math.round(basePrice * makingCharges),
            gst: Math.round(withMaking * gst),
            final: Math.round(finalPrice)
        }
    };
}

module.exports = { getLiveRates, calculatePrice };
