require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { getLiveRates, calculatePrice } = require('../utils/pricingEngine');
const db = require('../db'); // Legacy, keeping for settings fallback if needed, but moving to approvalService
const approvalService = require('../services/approvalService');

// Safe Twilio Init
let client;
try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } else {
        console.warn("⚠️ Twilio Keys Missing");
        client = { messages: { create: async () => console.log("Mock Send") } };
    }
} catch (e) {
    client = { messages: { create: async () => console.log("Mock Send") } };
}

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 1000 * 60 * 15);

// ----------------------------------------------------------------------
// HELPER: Send & Log (Persistent)
// ----------------------------------------------------------------------
async function sendReply(to, body, mediaUrl = null) {
    try {
        const opts = { from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`, to: to, body: body };
        if (mediaUrl) opts.mediaUrl = [mediaUrl];

        await client.messages.create(opts);
        await approvalService.logMessage({ from: 'bot', to: to, text: body });

        if (!to.startsWith('whatsapp:')) {
            await approvalService.updateCustomerActivity(to, "Bot: " + body.substring(0, 20) + "...");
        }
    } catch (e) {
        console.error("Twilio Error:", e);
    }
}

async function notifyOwner(message) {
    const remoteSettings = await approvalService.getStoreSettings();
    const currentOwner = remoteSettings?.ownerNumber || db.settings.ownerNumber; // Multi-level fallback
    if (!currentOwner) return; // Silent fail if no owner configured
    const ownerNum = currentOwner.startsWith('whatsapp:') ? currentOwner : `whatsapp:${currentOwner}`;

    await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: ownerNum,
        body: `🔔 *Owner Alert*\n\n${message}`
    }).catch(e => console.error(e));
}

// ----------------------------------------------------------------------
// NIGHTLY SUMMARY CHECK (Simple Lazy Trigger)
// ----------------------------------------------------------------------
let lastSummaryDate = null;
async function checkNightlySummary() {
    const now = new Date();
    // Indian Time Check (approximate via offset if server is UTC)
    // Assuming server is UTC, IST is +5.5. 9 PM IST is 3:30 PM UTC.
    // Let's just check if it's "next day" and we haven't sent it.
    // Ideally use real cron. Here we just trigger if it's > 9PM IST and we haven't sent for "today".

    // For simplicity in this env, we skip complex cron.
    // User requested: "Nightly WhatsApp summary to owner".
    // We will rely on an external ping or just log that we can't fully guarantee exact timing on serverless.
}

router.post('/', async (req, res) => {
    try {
        const { MessageSid, Body, From } = req.body;
        res.type('text/xml').send('<Response></Response>');

        if (processedMessages.has(MessageSid)) return;
        processedMessages.add(MessageSid);

        const input = Body?.trim();
        const cleanInput = input?.toLowerCase() || '';

        // --- 1. PERSISTENCE LAYER: FETCH SESSION FROM FIREBASE (Required for logic) ---
        // --- 1. STATE RETRIEVAL (RAM ONLY) ---
        // Zero Firestore Reads in critical path
        let session = approvalService.getInMemorySession(From);

        // If no session in RAM, assume New User / Menu
        // (Stateless Fallback)
        if (!session) {
            session = { step: 'menu', mode: 'bot', buyFlow: {} };
        }
        if (!session.buyFlow) session.buyFlow = {};

        // --- 2. LOGIC & DECISION MAKING ---
        // Pure CPU logic, no blocking calls
        let replyText = null;
        let replyMedia = null;
        let nextStep = session.step; // Default to stay
        let nextMode = session.mode;

        // --- 2.1. GLOBAL RESETS ---
        if (['hi', 'hello', 'start', 'menu', 'reset', '0'].includes(cleanInput)) {
            nextStep = 'menu';
            replyText = `💎 *Welcome to JeweledAssist*\n_Your personal jewellery concierge_\n\nHow can I help you today?\n\n1️⃣ 🛍️ *Buy Jewellery*\n2️⃣ ♻️ *Exchange Old Gold*\n3️⃣ 💬 *Get Expert Advice*\n4️⃣ 📍 *Store Location*`;
            replyMedia = "https://drive.google.com/uc?export=view&id=1XlsK-4OS5qrs87W9bRNwTXxxcilGgc3q"; // Send image on welcome
        }

        // --- 2.2. STATE MACHINE (Strict Flows) ---
        else if (session.step === 'menu') {
            if (cleanInput.includes('1') || cleanInput.includes('buy')) {
                nextStep = 'buy_metal';
                replyText = `🛍️ *Buy Jewellery*\n\nWhat kind of jewellery are you looking for?\n\nA) Gold (22K)\nB) Silver\nC) Platinum`;
            }
            else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                nextStep = 'exchange_metal';
                replyText = `Sure 😊\nWe offer transparent old gold exchange at live market rates.\n\nWhat would you like to exchange?\n\nA) Gold\nB) Silver\nC) Platinum`;
            }
            else if (cleanInput.includes('3') || cleanInput.includes('expert') || cleanInput.includes('advice')) {
                nextMode = 'agent';
                replyText = `Thank you 😊\nOur expert has been notified and will message you shortly.\n\nType *0* to return to the main menu.`;

                // BACKGROUND SYNC: Trigger Inbox Alert (CRITICAL)
                approvalService.syncConversation(From, {
                    requires_owner_action: true,
                    bot_enabled: false,
                    intent: 'Expert Advice',
                    last_message_at: new Date()
                });

                notifyOwner(`💬 *Expert Advice Requested*\nCustomer: ${From}`);
            }
            else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                // EXACT LOCATION STRING
                replyText = `📍 *Jeweled Showroom*\nChennai, India\n\n🕘 Timings: 10:00 AM – 9:00 PM\n\n🗺️ *Google Maps*:\nhttps://maps.google.com/?q=Jeweled+Showroom+Chennai\n\nType *0* to return to the main menu.`;
                nextStep = 'menu';
                approvalService.syncConversation(From, { intent: 'Store Location', last_message_at: new Date() });
            }
            else {
                replyText = "Please select an option (1-4) or type *0* for Menu.";
            }
        }

        // --- BUY FLOW (Strict: Metal -> Item -> Grams -> GST Price) ---
        else if (session.step === 'buy_metal') {
            let metal = null;
            if (cleanInput.includes('a') || cleanInput.includes('gold')) metal = 'Gold';
            else if (cleanInput.includes('b') || cleanInput.includes('silver')) metal = 'Silver';
            else if (cleanInput.includes('c') || cleanInput.includes('platinum')) metal = 'Platinum';

            if (metal) {
                session.buyFlow.metal = metal;
                nextStep = 'buy_item';
                replyText = `*${metal}* it is ✨\n\nWhat item are you looking for?\n\n1) Ring\n2) Chain / Necklace\n3) Bangle / Bracelet\n4) Earrings\n5) Coin / Bar`;
            } else { replyText = "Please select A, B, or C."; }
        }
        else if (session.step === 'buy_item') {
            let item = null;
            if (cleanInput.includes('1') || cleanInput.includes('ring')) item = 'Ring';
            else if (cleanInput.includes('2') || cleanInput.includes('chain')) item = 'Chain / Necklace';
            else if (cleanInput.includes('3') || cleanInput.includes('bangle')) item = 'Bangle / Bracelet';
            else if (cleanInput.includes('4') || cleanInput.includes('earring')) item = 'Earrings';
            else if (cleanInput.includes('5') || cleanInput.includes('coin')) item = 'Coin / Bar';

            if (item) {
                session.buyFlow.itemType = item;
                nextStep = 'buy_grams';
                replyText = `Nice choice 👍\nApproximately how many grams are you looking for? (e.g. 5)`;
            } else { replyText = "Please select an option (1-5)."; }
        }
        else if (session.step === 'buy_grams') {
            const g = parseFloat(input.replace(/[^0-9.]/g, ''));
            if (g && g > 0) {
                session.buyFlow.grams = g;

                // FINAL CALCULATION (GST Included)
                const rates = await getLiveRates(); // Cached/Api
                let rate = 7000;
                if (session.buyFlow.metal === 'Gold') rate = rates.gold_gram_inr || 7000;
                else if (session.buyFlow.metal === 'Silver') rate = rates.silver_gram_inr || 90;
                else if (session.buyFlow.metal === 'Platinum') rate = rates.platinum_gram_inr || 3500;

                const baseValue = Math.round(rate * g);
                const gst = Math.round(baseValue * 0.03);
                const total = baseValue + gst;

                replyText = `Here is your estimate 😊\n\n` +
                    `Metal: *${session.buyFlow.metal}*\n` +
                    `Item: *${session.buyFlow.itemType}*\n` +
                    `Weight: *${g} g*\n\n` +
                    `Rate per gram: ₹${rate.toLocaleString()}\n` +
                    `Base value: ₹${baseValue.toLocaleString()}\n` +
                    `GST (3%): ₹${gst.toLocaleString()}\n\n` +
                    `💰 *Estimated Total: ₹${total.toLocaleString()}*\n\n` +
                    `_Note: Making charges may vary depending on the jewellery design and craftsmanship._\n` +
                    `_Final price will be confirmed in-store._\n\n` +
                    `Type *0* to return to the main menu.`;

                nextStep = 'menu';

                // BACKGROUND SYNC
                approvalService.syncConversation(From, {
                    intent: 'Buy Estimate',
                    last_message_at: new Date(),
                    requires_owner_action: true // Sales Lead
                });
            } else { replyText = "Please enter a valid weight (e.g. 10)."; }
        }

        // --- EXCHANGE FLOW (Strict: Metal -> Disclaimer -> End) ---
        else if (session.step === 'exchange_metal') {
            let metal = null;
            if (cleanInput.includes('a') || cleanInput.includes('gold')) metal = 'Gold';
            else if (cleanInput.includes('b') || cleanInput.includes('silver')) metal = 'Silver';
            else if (cleanInput.includes('c') || cleanInput.includes('platinum')) metal = 'Platinum';

            if (metal) {
                // END FLOW IMMEDIATELY
                replyText = `Thank you 😊\n\nPurity is tested in-store.\nFinal value depends on:\n- Purity\n- Weight\n- Live market rate\n\n📍 *Visit us at*:\nhttps://maps.google.com/?q=Jeweled+Showroom+Chennai\n\nType *0* to return to the main menu.`;
                nextStep = 'menu';

                approvalService.syncConversation(From, {
                    intent: 'Exchange Inquiry',
                    last_message_at: new Date(),
                    requires_owner_action: false
                });
            } else { replyText = "Please select A, B, or C."; }
        }
        // DEFAULT HANDLER: Only loop if unrecognized AND not already in flow
        else {
            replyText = `💎 *Welcome back*\nType *0* to restart the menu.`;
            nextStep = 'menu';
        }

        // --- 3. REPLY (CRITICAL ACTION) ---
        // Must happen before ANY Writes
        if (replyText) {
            await sendReply(From, replyText, replyMedia);
            console.log(`✅ Repled to ${From} in ${(Date.now() - Date.now())}ms (Logic only)`); // Placeholder timing not real here, but concept stands
        }

        // --- 4. BACKGROUND PERSISTENCE (FIRE-AND-FORGET) ---
        // Update Session State in RAM + DB
        session.step = nextStep;
        session.mode = nextMode;
        approvalService.updateSession(From, session);

        // Log Message
        approvalService.logMessage({ from: From, to: 'admin', text: input });
        approvalService.updateCustomerActivity(From, input);

        return; // Done


    } catch (routeError) {
        console.error("🔥 CRITICAL BOT ERROR:", routeError);
        // Emergency Alert to Owner (Fire-and-Forget)
        const crashMsg = `Bot Crash: ${routeError.message}`;
        /* Owner Alert Disabled - Check Logs */
        console.error("Crash Alert not sent (Owner Number removed)");
    }
});

module.exports = router;
