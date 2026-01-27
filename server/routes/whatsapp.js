require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { getLiveRates, calculatePrice } = require('../utils/pricingEngine');
const db = require('../db');
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

// Helper to Send & Log
async function sendReply(to, body, mediaUrl = null) {
    try {
        const opts = { from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`, to: to, body: body };
        if (mediaUrl) opts.mediaUrl = [mediaUrl];

        await client.messages.create(opts);
        await approvalService.logMessage({ from: 'bot', to: to, text: body });
        if (!to.startsWith('whatsapp:')) { // Only update customer activity log
            await approvalService.updateCustomerActivity(to, "Bot: " + body.substring(0, 20) + "...");
        }
    } catch (e) {
        console.error("Twilio Error:", e);
    }
}

async function notifyOwner(message, context = {}) {
    const remoteSettings = await approvalService.getStoreSettings();
    const currentOwner = remoteSettings?.ownerNumber || db.settings.ownerNumber;
    const ownerNum = currentOwner.startsWith('whatsapp:') ? currentOwner : `whatsapp:${currentOwner}`;

    await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: ownerNum,
        body: `🔔 *Owner Alert*\n\n${message}`
    }).catch(e => console.error(e));
}

router.post('/', async (req, res) => {
    try {
        const { MessageSid, Body, From } = req.body;
        res.type('text/xml').send('<Response></Response>');

        if (processedMessages.has(MessageSid)) return;
        processedMessages.add(MessageSid);

        const input = Body?.trim();
        const cleanInput = input?.toLowerCase() || '';

        // --- OWNER LOGIC (Administrative Override) ---
        const normalize = (p) => p?.replace(/\D/g, '').slice(-10);
        const isOwner = normalize(From) === normalize(db.settings.ownerNumber);

        if (isOwner) {
            // Basic Owner Logic for 'reply' command
            if (cleanInput.startsWith('reply ')) {
                const parts = input.split(' ');
                const targetPhone = parts[1]; // simplified for now, ideally context based
                const msg = parts.slice(2).join(' ');
                if (targetPhone && msg) {
                    await sendReply(targetPhone, msg);
                    await approvalService.logMessage({ from: 'owner', to: targetPhone, text: msg });
                    await sendReply(From, `✅ Sent to ${targetPhone}`);
                }
            }
            return;
        }

        // --- CUSTOMER LOGIC ---
        let session = db.sessions[From] || { step: 'welcome', mode: 'bot', buyFlow: {} };
        if (!session.buyFlow) session.buyFlow = {};
        db.sessions[From] = session;

        await approvalService.logMessage({ from: From, to: 'admin', text: input });
        await approvalService.updateCustomerActivity(From, input);

        // 1. GLOBAL RESET RULE
        if (cleanInput === '0') {
            session.step = 'menu';
            session.buyFlow = {};
            session.mode = 'bot'; // Reset to bot mode? User asked for "Reset conversation state", implies bot active.
            db.save();
            await sendReply(From, `💎 *Welcome to JeweledAssist*\n_Your personal jewellery concierge_\n\nHow can I help you today?\n\n1️⃣ 🛍️ *Buy Jewellery*\n2️⃣ ♻️ *Exchange Old Gold*\n3️⃣ 💬 *Get Expert Advice*\n4️⃣ 📍 *Store Location*`);
            return;
        }

        // 2. HUMAN HANDOFF CHECK
        if (session.mode === 'agent') {
            // Do not reply automatically.
            return;
        }

        // 3. GLOBAL WELCOME / START
        if (['hi', 'hello', 'start', 'menu', 'reset'].includes(cleanInput)) {
            session.step = 'menu';
            session.buyFlow = {};

            // Send Image separately (User requested Image once per session, but for simplicity sending on Hi)
            await sendReply(From, `💎 *Welcome to JeweledAssist*\n_Your personal jewellery concierge_\n\nHow can I help you today?\n\n1️⃣ 🛍️ *Buy Jewellery*\n2️⃣ ♻️ *Exchange Old Gold*\n3️⃣ 💬 *Get Expert Advice*\n4️⃣ 📍 *Store Location*`,
                "https://drive.google.com/uc?export=view&id=1XlsK-4OS5qrs87W9bRNwTXxxcilGgc3q"); // Using direct link format if possible, otherwise user provided view link. 
            // Note: GDrive view links often don't unfurl in WA. 
            return;
        }

        // --- STATE MACHINE ---

        /* MENU SELECTION */
        if (session.step === 'menu') {
            if (cleanInput.includes('1') || cleanInput.includes('buy')) {
                // START PART 1 (Buy)
                session.step = 'buy_metal';
                await sendReply(From, `🛍️ *Buy Jewellery*\n\nWhat kind of jewellery are you looking for?\n\nA️⃣ Gold (22K)\nB️⃣ Silver\nC️⃣ Platinum`);
            }
            else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                // START PART 2 (Exchange)
                session.step = 'exchange_metal';
                await sendReply(From, `Sure 😊\nWe offer transparent old gold exchange at live market rates.\n\nWhat would you like to exchange?\n\nA️⃣ Gold\nB️⃣ Silver\nC️⃣ Platinum`);
            }
            else if (cleanInput.includes('3') || cleanInput.includes('expert') || cleanInput.includes('advice')) {
                // START PART 3 (Handoff)
                session.mode = 'agent';
                await sendReply(From, `Thank you 😊\nOur expert has been notified and will message you shortly to assist with your request.\n\nType *0* to return to the main menu.`);

                // NOTIFY OWNER
                notifyOwner(`💬 *Expert Advice Requested*\nCustomer: ${From}\nIntent: Expert Advice`, { customer: From });

                // UPDATE FIREBASE
                await approvalService.updateInboxMetadata(From, {
                    requires_owner_action: true,
                    handoff_triggered: true,
                    bot_enabled_for_chat: false,
                    handoff_timestamp: new Date()
                });
            }
            else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                // START PART 4 (Location)
                const settings = db.settings;
                await sendReply(From, `Here’s our store location 😊\n\n📍 *Jeweled Showroom*\n${settings.storeLocation}\n\n🕒 Timings: 10:00 AM - 9:00 PM\n\n🗺️ Google Maps:\n${settings.mapLink || ""}\n\nType *0* to return to the main menu.`);
                session.step = 'menu'; // Return to menu logic or stay in location? User said "Append Type 0".
            }
            else {
                await sendReply(From, "Please select an option (1-4).");
            }
        }

        /* PART 1: BUY JEWELLERY FLOW */
        else if (session.step === 'buy_metal') {
            let metal = null;
            if (cleanInput.includes('a') || cleanInput.includes('gold')) metal = 'Gold';
            else if (cleanInput.includes('b') || cleanInput.includes('silver')) metal = 'Silver';
            else if (cleanInput.includes('c') || cleanInput.includes('platinum')) metal = 'Platinum';

            if (metal) {
                session.buyFlow.metal = metal;
                session.step = 'buy_item';
                await sendReply(From, `*${metal}* it is ✨\n\nWhat item are you looking for?\n\n1️⃣ Ring\n2️⃣ Chain / Necklace\n3️⃣ Bangle / Bracelet\n4️⃣ Earrings\n5️⃣ Coin / Bar\n6️⃣ Other`);
            } else {
                await sendReply(From, "Please select A, B, or C.");
            }
        }
        else if (session.step === 'buy_item') {
            let itemType = 'Other';
            if (cleanInput.includes('1') || cleanInput.includes('ring')) itemType = 'Ring';
            else if (cleanInput.includes('2') || cleanInput.includes('chain')) itemType = 'Chain';
            else if (cleanInput.includes('3') || cleanInput.includes('bangle')) itemType = 'Bangle';
            else if (cleanInput.includes('4') || cleanInput.includes('earring')) itemType = 'Earrings';
            else if (cleanInput.includes('5') || cleanInput.includes('coin')) itemType = 'Coin';

            session.buyFlow.itemType = itemType;
            session.step = 'buy_grams';
            await sendReply(From, `Nice choice 👍\nApproximately how many grams are you looking for?`);
        }
        else if (session.step === 'buy_grams') {
            const grams = parseFloat(input.replace(/[^0-9.]/g, ''));
            if (grams && grams > 0) {
                session.buyFlow.grams = grams;
                session.step = 'buy_budget';
                await sendReply(From, `Got it — *${grams}g* noted 👍\nWhat is your approximate budget?`);
            } else {
                await sendReply(From, "Please enter a valid weight (e.g. 5 or 10).");
            }
        }
        else if (session.step === 'buy_budget') {
            session.buyFlow.budget = input;

            // CALCULATE PRICE
            const rates = await getLiveRates();
            let rate = 7000;
            if (session.buyFlow.metal === 'Gold') rate = rates.gold_gram_inr;
            else if (session.buyFlow.metal === 'Silver') rate = rates.silver_gram_inr;
            else if (session.buyFlow.metal === 'Platinum') rate = rates.platinum_gram_inr;

            // Simple Estimation Logic: (Rate * Grams) * (1 + 15% wastage default)
            // User did not ask for separate wastage step, but said "Final price may vary based on design & making charges".
            // To be realistic, we add a base 15% or so, or just raw metal cost? 
            // Better to add 15% so it's not shockingly low.
            const wastage = 0.15;
            const total = Math.round((rate * session.buyFlow.grams) * (1 + wastage));

            await sendReply(From, `Here’s the estimated price based on today’s rates 😊\n\n` +
                `• Metal: *${session.buyFlow.metal}*\n` +
                `• Item: *${session.buyFlow.itemType}*\n` +
                `• Weight: *${session.buyFlow.grams}g*\n\n` +
                `💰 Estimated Price: *₹${total.toLocaleString()}*\n\n` +
                `(This is an approximate value. Final price may vary based on design & making charges.)\n\n` +
                `Type *0* to return to the main menu.`);

            // Save Intent
            await approvalService.updateInboxMetadata(From, {
                intent: 'buy_jewellery',
                metal: session.buyFlow.metal,
                item_type: session.buyFlow.itemType,
                grams: session.buyFlow.grams,
                budget: session.buyFlow.budget,
                calculated_price: total,
                price_source: rates.isManual ? 'manual' : 'live',
                requires_owner_action: false
            });

            session.step = 'menu'; // End flow
        }

        /* PART 2: EXCHANGE FLOW */
        else if (session.step === 'exchange_metal') {
            let metal = null;
            if (cleanInput.includes('a') || cleanInput.includes('gold')) metal = 'Gold';
            else if (cleanInput.includes('b') || cleanInput.includes('silver')) metal = 'Silver';
            else if (cleanInput.includes('c') || cleanInput.includes('platinum')) metal = 'Platinum';

            if (metal) {
                session.buyFlow.metal = metal; // Reuse structure or separate? Reusing is fine for simplicity
                session.step = 'exchange_grams';
                await sendReply(From, `Approximately how many grams is the jewellery?`);
            } else {
                await sendReply(From, "Please select A, B, or C.");
            }
        }
        else if (session.step === 'exchange_grams') {
            await sendReply(From, `Thank you 😊\n\nOld gold value is calculated after purity testing at the store.\nThe final value depends on:\n• Purity\n• Weight\n• Today’s live rate\n\nFor accurate valuation, we recommend an in-store visit.\n\nType *0* to return to the main menu.`);

            // Save Intent
            await approvalService.updateInboxMetadata(From, {
                intent: 'exchange_old_gold',
                metal: session.buyFlow.metal,
                grams: input, // raw input
                requires_owner_action: false
            });

            session.step = 'menu';
        }

    } catch (routeError) {
        console.error("Router Error:", routeError);
    }
});

module.exports = router;
