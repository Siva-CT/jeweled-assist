const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');

let cachedRates = { gold_gram_inr: 7000, silver_gram_inr: 90, platinum_gram_inr: 3500 };
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 Minute

function getLiveRates() {
    return new Promise((resolve) => {
        const now = Date.now();

        // 1. FAST RETURN: Use Cache or Manual Override
        if ((now - lastFetchTime < CACHE_DURATION) && cachedRates.gold_gram_inr > 0) {
            return resolve(applyManualOverrides(cachedRates));
        }

        // 2. TIMEOUT PROTECTION
        let isResolved = false;
        const safeResolve = (data) => {
            if (isResolved) return;
            isResolved = true;
            resolve(applyManualOverrides(data));
        };

        const timeout = setTimeout(() => {
            console.error("⚠️ Pricing Engine Timeout - Using Fallback");
            safeResolve(cachedRates);
        }, 4000); // 4s Timeout

        // 3. SPAWN PYTHON
        try {
            const pythonScript = path.join(__dirname, 'fetch_rates.py');
            const pythonProcess = spawn('python', [pythonScript]);
            let dataString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Stderr: ${data}`);
            });

            pythonProcess.on('error', (err) => {
                clearTimeout(timeout);
                console.error("❌ Failed to spawn Python:", err.message);
                safeResolve(cachedRates);
            });

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    return safeResolve(cachedRates);
                }
                try {
                    let result = JSON.parse(dataString);
                    // Validate
                    if (!result.gold_gram_inr) result.gold_gram_inr = 7000;
                    if (!result.silver_gram_inr) result.silver_gram_inr = 90;
                    if (!result.platinum_gram_inr) result.platinum_gram_inr = 3500;

                    cachedRates = result;
                    lastFetchTime = now;
                    safeResolve(result);
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    safeResolve(cachedRates);
                }
            });
        } catch (e) {
            clearTimeout(timeout);
            safeResolve(cachedRates);
        }
    });
}

function applyManualOverrides(rates) {
    const finalRates = { ...rates };
    const settings = db.settings || {}; // Safety

    if (settings.useManualRates && settings.manualRates) {
        if (settings.manualRates.gold > 0) finalRates.gold_gram_inr = parseFloat(settings.manualRates.gold);
        if (settings.manualRates.silver > 0) finalRates.silver_gram_inr = parseFloat(settings.manualRates.silver);
        if (settings.manualRates.platinum > 0) finalRates.platinum_gram_inr = parseFloat(settings.manualRates.platinum);
        finalRates.isManual = true;
    }
    return finalRates;
}

async function calculatePrice(metal, weight, makingCharges = 0.15, gst = 0.03) {
    const rates = await getLiveRates();
    let rate = 7000;

    const m = metal.toLowerCase();
    if (m.includes('gold') || m === 'a') rate = rates.gold_gram_inr;
    else if (m.includes('silver') || m === 'b') rate = rates.silver_gram_inr;
    else if (m.includes('platinum') || m === 'c') rate = rates.platinum_gram_inr;

    const basePrice = rate * weight;
    const withMaking = basePrice * (1 + makingCharges);
    const finalPrice = withMaking * (1 + gst);

    return {
        rate,
        finalPrice: Math.round(finalPrice)
    };
}

module.exports = { getLiveRates, calculatePrice };
