const { getLiveRates, calculatePrice } = require('./server/utils/pricingEngine');

async function test() {
    console.log("Testing Pricing Engine Bridge...");
    try {
        const rates = await getLiveRates();
        console.log("Live Rates:", rates);

        const price = await calculatePrice(10); // 10 grams
        console.log("Price for 10g:", price);

        if (rates.status === 'success' && price.breakdown.final > 0) {
            console.log("✅ VERIFICATION SUCCESS");
        } else {
            console.error("❌ VERIFICATION FAILED");
        }
    } catch (e) {
        console.error("❌ CRITICAL ERROR:", e);
    }
}

test();
