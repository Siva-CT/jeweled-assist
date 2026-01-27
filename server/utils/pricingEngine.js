const { spawn } = require('child_process');
const path = require('path');

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000;

function getLiveRates() {
    return new Promise((resolve, reject) => {
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

        pythonProcess.on('error', (err) => {
            console.error("❌ Failed to spawn Python:", err.message);
            resolve(cachedRates || { gold_gram_inr: 15596, status: 'fallback_python_missing' });
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                return resolve(cachedRates || { gold_gram_inr: 15596, status: 'fallback' });
            }
            try {
                const result = JSON.parse(dataString);

                // Manual Override
                const db = require('../db');
                if (db.settings.manualRates) {
                    if (db.settings.manualRates.gold > 0) result.gold_gram_inr = parseFloat(db.settings.manualRates.gold);
                }

                cachedRates = result;
                lastFetchTime = now;
                resolve(result);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                resolve(cachedRates || { gold_gram_inr: 15596, status: 'fallback_parse' });
            }
        });
    });
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
