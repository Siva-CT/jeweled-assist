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
const idleTimers = {};

// Helper to Send & Log
async function sendReply(to, body, mediaUrl = null) {
    try {
        const opts = {
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: to,
            body: body
        };
        if (mediaUrl) opts.mediaUrl = [mediaUrl];

        await client.messages.create(opts);

        // Log to Firebase
        await approvalService.logMessage({ from: 'bot', to: to, text: body });
        // Update Customer Activity (if not bot)
        if (to !== 'admin' && to !== 'owner' && !to.startsWith('whatsapp:')) {
            await approvalService.updateCustomerActivity(to, "Bot: " + body.substring(0, 20) + "...");
        }
    } catch (e) {
        console.error("Twilio Error:", e);
    }
}

async function notifyOwner(message, context = {}) {
    if (context.customer) {
        db.ownerContext = { customer: context.customer, reqId: context.reqId };
    }
    // Refresh Settings for Owner Number
    const remoteSettings = await approvalService.getStoreSettings(); // Use Correct Method Name
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

        // 1. IDEMPOTENCY
        res.type('text/xml').send('<Response></Response>');

        if (processedMessages.has(MessageSid)) return;
        processedMessages.add(MessageSid);

        // 2. CHECK BOT STATUS
        const botStatus = await approvalService.getBotStatus();
        if (!botStatus.active && From !== process.env.TWILIO_PHONE_NUMBER) {
            await approvalService.logMessage({ from: From, to: 'admin', text: Body });
            await approvalService.updateInboxMetadata(From, {
                lastQuery: Body,
                lastContact: new Date(),
                actionRequired: true,
                status: 'manual_handling'
            });
            return;
        }

        const input = Body?.trim();
        const cleanInput = input?.toLowerCase() || '';

        // --- OWNER LOGIC ---
        const normalize = (p) => p?.replace(/\D/g, '').slice(-10);
        const isOwner = normalize(From) === normalize(db.settings.ownerNumber);

        if (isOwner) {
            // ... (Owner logic remains mostly same, condensed for brevity/safety)
            const lastContext = db.ownerContext || {};

            if (cleanInput.startsWith('approve')) {
                // ... same approval logic
                const parts = cleanInput.split(' ');
                const price = parts[1];
                const reqItem = db.pendingApprovals.find(p => p.id === lastContext.reqId);
                if (reqItem) {
                    reqItem.status = 'approved';
                    reqItem.finalPrice = price;
                    db.save();
                    await sendReply(reqItem.customer, `🎉 *The owner has approved a special price for your request!*\n\nApprox Estimate: ₹${price}\n\nVisit our showroom today to finalize the design!`);
                    await sendReply(From, `✅ Approved request for ${reqItem.customer} at ₹${price}`);
                }
                return;
            }
            else if (cleanInput.startsWith('reply')) {
                const msg = input.substring(input.indexOf(' ') + 1);
                if (lastContext.customer) {
                    await sendReply(lastContext.customer, msg);
                    await approvalService.logMessage({ from: 'owner', to: lastContext.customer, text: msg });
                    await sendReply(From, `📤 Sent to ${lastContext.customer}: "${msg}"`);
                }
                return;
            }

            // Relay everything else if context exists
            if (lastContext.customer) {
                await sendReply(lastContext.customer, input);
                await approvalService.logMessage({ from: 'owner', to: lastContext.customer, text: input });
                return;
            }
            return;
        }

        // --- CUSTOMER LOGIC ---
        let session = db.sessions[From] || { step: 'welcome', mode: 'bot' };

        // Ensure session structure
        if (!session.buyFlow) session.buyFlow = {};

        if (!db.sessions[From]) {
            db.stats.totalQueries = (db.stats.totalQueries || 0) + 1;
            db.save();
        }
        db.sessions[From] = session;
        await approvalService.logMessage({ from: From, to: 'admin', text: input });
        await approvalService.updateCustomerActivity(From, input);

        // HUMAN MODE
        if (session.mode === 'agent') {
            if (cleanInput === 'bot' || cleanInput === 'menu') {
                session.mode = 'bot';
                session.step = 'menu';
                db.save();
                await sendReply(From, "🤖 *The Jewel Bot is back!*");
                return;
            }
            return;
        }

        try {
            // GLOBAL COMMANDS
            if (['hi', 'hello', 'start', 'menu', 'reset'].includes(cleanInput)) {
                session.step = 'menu';
                session.buyFlow = {}; // Reset flow data
                await sendReply(From, `💎 *Welcome to JeweledAssist*\n_Your personal jewellery concierge_\n\nPlease choose an option 👇\n\n1️⃣ 🛍️ *Buy Jewellery*\n2️⃣ ♻️ *Exchange Old Gold*\n3️⃣ 💬 *Get Expert Advice*\n4️⃣ 📍 *Store Location*`);
                return;
            }

            // --- STATE MACHINE ---

            /* 1. MAIN MENU */
            if (session.step === 'menu') {
                if (cleanInput.includes('1') || cleanInput.includes('buy')) {
                    // NEW BUY FLOW START
                    session.step = 'buy_type';
                    await sendReply(From, `🛍️ *Buy Jewellery*\n\nWhat kind of jewellery are you looking for?\n\nA. Gold (22K)\nB. Silver\nC. Platinum`);
                }
                else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                    session.step = 'exchange_sub';
                    await sendReply(From, `♻️ *Exchange Old Gold*\n\nWe offer transparent exchange at live market rates 🔒\n\nPlease choose:\n\n1️⃣ Check today’s gold rate\n2️⃣ Book an exchange visit`);
                }
                else if (cleanInput.includes('3') || cleanInput.includes('advice')) {
                    session.step = 'advice_sub';
                    await sendReply(From, `💬 *Get Expert Advice*\n\n1️⃣ Gold & Silver prices\n2️⃣ Making charges\n3️⃣ Bridal guidance`);
                }
                else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                    await sendReply(From, `📍 *Jeweled Showroom*\n\n123 Gold Street, Market City, Chennai\n\n🕒 10:00 AM - 9:00 PM (Mon-Sat)`);
                    session.step = 'menu';
                }
            }

            /* 2. NEW DEEP BUY FLOW */
            else if (session.step === 'buy_type') {
                let metal = null;
                if (cleanInput.includes('gold') || cleanInput === 'a') metal = 'Gold';
                else if (cleanInput.includes('silver') || cleanInput === 'b') metal = 'Silver';
                else if (cleanInput.includes('platinum') || cleanInput === 'c') metal = 'Platinum';

                if (metal) {
                    session.buyFlow.metal = metal;
                    session.step = 'buy_grams';
                    await sendReply(From, `👍 *${metal}* it is.\n\nApprox how many grams? (e.g. 10, 25)`);
                } else {
                    await sendReply(From, "Please select Gold, Silver, or Platinum.");
                }
            }
            else if (session.step === 'buy_grams') {
                const grams = parseFloat(input.replace(/[^0-9.]/g, ''));
                if (grams && grams > 0) {
                    session.buyFlow.grams = grams;
                    session.step = 'buy_budget';
                    await sendReply(From, `⚖️ *${grams}g* noted.\n\nWhat is your approximate budget? (e.g. 50000, 1L)`);
                } else {
                    await sendReply(From, "Please enter a valid weight (e.g. 10).");
                }
            }
            else if (session.step === 'buy_budget') {
                session.buyFlow.budget = input; // textual budget is fine
                session.step = 'buy_category';
                await sendReply(From, `💰 Budget noted.\n\nFinally, what's the occasion/category?\n\n1️⃣ Bridal Jewellery 💍\n2️⃣ Daily Wear 📿\n3️⃣ Investment / Coins 🪙`);
            }
            else if (session.step === 'buy_category') {
                let category = 'General';
                let wastagePct = 0.15; // default 15%

                if (cleanInput.includes('1') || cleanInput.includes('bridal')) { category = 'Bridal'; wastagePct = 0.25; } // 25% WASTAGE
                else if (cleanInput.includes('2') || cleanInput.includes('daily')) { category = 'Daily'; wastagePct = 0.15; } // 15% WASTAGE
                else if (cleanInput.includes('3') || cleanInput.includes('investment')) { category = 'Investment'; wastagePct = 0.05; } // 5% WASTAGE

                session.buyFlow.category = category;

                // CALCULATE PRICE
                const rates = await getLiveRates();
                let rate = 7000;
                if (session.buyFlow.metal === 'Gold') rate = rates.gold_gram_inr;
                else if (session.buyFlow.metal === 'Silver') rate = rates.silver_gram_inr;
                else if (session.buyFlow.metal === 'Platinum') rate = rates.platinum_gram_inr;

                const base = rate * session.buyFlow.grams;
                const wastageAmount = base * wastagePct;
                const totalBeforeGst = base + wastageAmount;
                const gst = totalBeforeGst * 0.03;
                const final = Math.round(totalBeforeGst + gst);

                await sendReply(From, `💎 *Estimation for ${category} ${session.buyFlow.metal}*\n\n` +
                    `• Weight: ${session.buyFlow.grams}g\n` +
                    `• Live Rate: ₹${rate}/g\n` +
                    `• Wastage: ${(wastagePct * 100)}% (Included)\n` +
                    `• GST: 3%\n\n` +
                    `💰 *Approx Total: ₹${final.toLocaleString()}*\n\n` +
                    `_Browse our catalog: [link removed]_\n\n` +
                    `📉 *To get a reduced price or make an offer, type your offer below!*`
                );

                // Tag Intent
                await approvalService.updateInboxMetadata(From, {
                    intent: category,
                    metal: session.buyFlow.metal,
                    actionRequired: true // Mark as active prospect
                });

                // Wait for offer
                session.step = 'buy_offer';
            }
            else if (session.step === 'buy_offer') {
                // User types something (Offer or question)
                await sendReply(From, `📩 *Offer Received*\n\nI have forwarded your request to the owner. Please wait for a moment...`);

                notifyOwner(
                    `🤑 *Price Negotiation*\nUser offered: "${input}"\nFor: ${session.buyFlow.grams}g ${session.buyFlow.metal} (${session.buyFlow.category})`,
                    { customer: From }
                );

                // Mark for manual handling
                await approvalService.updateInboxMetadata(From, { actionRequired: true, status: 'negotiating' });

                // Switch to agent logic effectively (or just stay in loop)
                // We keep them in 'buy_offer' so subsequent messages also relay?
                // Or switch to agent mode?
                // Let's switch to agent mode so owner takes over fully.
                session.mode = 'agent';
            }

            /* 3. EXCHANGE SUB-FLOW (FIXED) */
            else if (session.step === 'exchange_sub') {
                if (cleanInput.includes('1') || cleanInput.includes('rate')) {
                    const rates = await getLiveRates();
                    const gold = rates?.gold_gram_inr || 'N/A';
                    const silver = rates?.silver_gram_inr || 'N/A';
                    await sendReply(From, `📉 *Today's Rates*\nGold: ₹${gold}/g\nSilver: ₹${silver}/g\n\nType 'Book' to schedule a visit.`);
                }
                else if (cleanInput.includes('2') || cleanInput.includes('book')) {
                    session.step = 'exchange_book_confirm';
                    await sendReply(From, "📅 When would you like to visit? (e.g. 5 PM today)");
                }
                else {
                    await sendReply(From, "Please select 1 or 2.");
                }
            }
            else if (session.step === 'exchange_book_confirm') {
                await sendReply(From, `✅ Visit scheduled for ${input}.\n\n📍 ${db.settings.storeLocation}`);
                notifyOwner(`📅 Exchange Visit: ${input}`, { customer: From });
                session.step = 'menu';
            }

            /* 4. ADVICE SUB-FLOW */
            else if (session.step === 'advice_sub') {
                await sendReply(From, "Our experts are available. Type 'Menu' to go back.");
                session.step = 'menu';
            }

        } catch (e) { console.error(e); }
    } catch (routeError) {
        console.error("Router Error:", routeError);
    }
});

module.exports = router;
