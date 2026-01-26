const yahooFinance = require('yahoo-finance2').default;

// Cache the rate to avoid spamming Yahoo
let cachedRate = null;
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 1; // 1 minute for demo

async function getGoldRate() {
    const now = Date.now();
    if (cachedRate && (now - lastFetch < CACHE_DURATION)) {
        return cachedRate;
    }

    try {
        const quote = await yahooFinance.quote('GC=F');
        // Convert Ounce to Gram (approx) and USD to INR (approx) or just use the raw value if it's INR
        // GC=F is usually USD per Troy Ounce.
        // 1 Troy Ounce = 31.1035 grams.
        // Let's assume we need to convert to INR/gram.
        // For simplicity in this demo, we might need a fixed multiplier or fetch USDINR=X too.

        // Let's get USDINR too
        const forex = await yahooFinance.quote('USDINR=X');
        const usdInr = forex.regularMarketPrice;
        const goldUsdOz = quote.regularMarketPrice;

        // Formula: (Gold USD/oz * USD/INR) / 31.1035
        const goldInrGram = (goldUsdOz * usdInr) / 31.1035;

        const rate = Math.round(goldInrGram);

        cachedRate = rate;
        lastFetch = now;
        return rate;
    } catch (error) {
        console.error("Error fetching gold rate:", error);
        // Fallback to a static safe value if API fails
        return cachedRate || 6500;
    }
}

module.exports = { getGoldRate };
