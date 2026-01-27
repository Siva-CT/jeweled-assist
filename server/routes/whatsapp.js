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

// Helper: Normalize Metal Input
const detectMetal = (text) => {
    const t = text.toLowerCase();
    if (t.includes('gold') || t.includes('22k') || t.includes('916') || t === 'a') return 'Gold';
    if (t.includes('silver') || t.includes('925') || t === 'b') return 'Silver';
    if (t.includes('platinum') || t.includes('pt') || t === 'c') return 'Platinum';
    return null;
};

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
    const remoteSettings = await approvalService.getSettings();
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

        // 1. IDEMPOTENCY: Reply 200 OK immediately to stop Twilio retries/loops
        res.type('text/xml').send('<Response></Response>');

        if (processedMessages.has(MessageSid)) return;
        processedMessages.add(MessageSid);

        // SYNC SETTINGS (Ensure we have latest Owner Number)
        const remoteSettings = await approvalService.getSettings();
        if (remoteSettings) {
            Object.assign(db.settings, remoteSettings);
        }

        const input = Body?.trim();
        const cleanInput = input?.toLowerCase() || '';

        // --- OWNER LOGIC ---
        const normalize = (p) => p?.replace(/\D/g, '').slice(-10);
        const isOwner = normalize(From) === normalize(db.settings.ownerNumber);

        if (isOwner) {
            const lastContext = db.ownerContext || {};

            if (cleanInput.startsWith('approve')) {
                const parts = cleanInput.split(' ');
                const price = parts[1];
                if (!lastContext.reqId || !price) {
                    await sendReply(From, "❌ usage: 'Approve <Amount>' (for last request)");
                    return;
                }
                const reqItem = db.pendingApprovals.find(p => p.id === lastContext.reqId);
                if (reqItem) {
                    reqItem.status = 'approved';
                    reqItem.finalPrice = price;
                    db.save(); // SAVE
                    await sendReply(reqItem.customer, `🎉 *The owner has approved a special price for your request!*\n\nApprox Estimate: ₹${price}\n\nVisit our showroom today to finalize the design!`);
                    await sendReply(From, `✅ Approved request for ${reqItem.customer} at ₹${price}`);
                } else {
                    await sendReply(From, "❌ Request ID not found or expired.");
                }
                return;

            } else if (cleanInput.startsWith('reply') || cleanInput.startsWith('chat')) {
                const msg = input.substring(input.indexOf(' ') + 1);
                const target = lastContext.customer;
                if (!target) {
                    await sendReply(From, "❌ No active customer context.");
                    return;
                }
                await sendReply(target, msg);
                // Log Owner Reply to Firebase
                await approvalService.logMessage({ from: 'owner', to: target, text: msg });
                await sendReply(From, `📤 Sent to ${target}: "${msg}"`);
                return;

            } else if (cleanInput === 'status') {
                await sendReply(From, `📊 *System Status*\nPending IDs: ${db.pendingApprovals.filter(p => p.status === 'pending_approval').length}\nLast Active: ${lastContext.customer || 'None'}`);
                return;

            } else if (cleanInput === 'help') {
                await sendReply(From, "👨‍💻 *Owner Commands*\n\n- *Approve [Amount]*\n- *Reply [Msg]*\n- *Nudge* (Remind Customer)\n- *Mode [Agent/Bot]*\n- *Set Threshold [Val]*\n- *Set Gold [Val]*\n- *Status*");
                return;

            } else if (cleanInput.startsWith('set threshold')) {
                const val = parseInt(cleanInput.split(' ')[2]);
                if (val) {
                    db.settings.approvalThreshold = val;
                    db.save(); // SAVE
                    await sendReply(From, `✅ Approval Threshold set to ₹${val}`);
                }
                return;

            } else if (cleanInput.startsWith('nudge')) {
                const target = lastContext.customer;
                if (!target) { await sendReply(From, "❌ No active customer context."); return; }

                await sendReply(target, `👋 *Just a gentle reminder!*\n\nWe are holding your special price estimate at Jeweled Showroom. When can we expect you?`);
                // Log as system message so it appears in history
                await approvalService.logMessage({ from: 'owner', to: target, text: '[ACTION: NUDGE SENT]' });
                await sendReply(From, `✅ Nudge sent to ${target}`);
                return;

            } else if (cleanInput.startsWith('mode')) {
                const target = lastContext.customer;
                if (!target) { await sendReply(From, "❌ No active customer context."); return; }

                const newMode = cleanInput.includes('agent') || cleanInput.includes('human') ? 'agent' : 'bot';
                if (!db.sessions[target]) db.sessions[target] = { step: 'menu', mode: newMode };
                else db.sessions[target].mode = newMode;
                db.save();

                await sendReply(From, `✅ Switched ${target} to *${newMode.toUpperCase()}* mode.`);
                return;

            } else if (cleanInput.startsWith('set gold')) {
                const val = parseInt(cleanInput.split(' ')[2]);
                if (val) {
                    if (!db.settings.manualRates) db.settings.manualRates = {};
                    db.settings.manualRates.gold = val;
                    db.save(); // SAVE
                    await sendReply(From, `✅ Manual Gold Rate set to ₹${val}/g`);
                }
                return;
            }

            // Forwarding (Relay Logic)
            if (lastContext.customer) {
                await sendReply(lastContext.customer, input);
                await approvalService.logMessage({ from: 'owner', to: lastContext.customer, text: input });
                return;
            }
            await sendReply(From, "🤖 Owner Mode. Type *Help* for commands.");
            return;
        }

        // --- CUSTOMER LOGIC ---
        let session = db.sessions[From] || { step: 'welcome', mode: 'bot' };

        // INCREMENT STATS
        if (!db.sessions[From]) {
            db.stats.totalQueries = (db.stats.totalQueries || 0) + 1;
            db.save();
        }

        db.sessions[From] = session;
        // Log Incoming Message (Firebase)
        await approvalService.logMessage({ from: From, to: 'admin', text: input });
        await approvalService.updateCustomerActivity(From, input);

        // AGENT MODE (Human Takeover)
        if (session.mode === 'agent') {
            if (cleanInput === 'bot' || cleanInput === 'menu' || cleanInput === 'bot takeover') {
                session.mode = 'bot';
                session.step = 'menu';
                db.save(); // SAVE
                await sendReply(From, "🤖 *The Jewel Bot is back!*");
                return;
            }
            if (idleTimers[From]) clearTimeout(idleTimers[From]);
            idleTimers[From] = setTimeout(() => {
                sendReply(From, `👋 *Session Closed*\n\nThank you for your enquiry. Feel free to visit us anytime.\n\n📍 ${db.settings.storeLocation}`);
                session.mode = 'bot';
                // PRUNE MEMORY
                db.prune();
            }, 10 * 60 * 1000); // 10 Min Timeout
            return;
        }

        try {
            if (['hi', 'hello', 'start', 'menu', 'reset'].includes(cleanInput)) {
                session.step = 'menu';
                // Greeting Image
                const GREETING_IMG = 'https://drive.google.com/uc?id=1XlsK-4OS5qrs87W9bRNwTXxxcilGgc3q';
                await sendReply(From, `💎 *Welcome to JeweledAssist!* \n\nHow can I help you today?\n\n1️⃣ *Buy Jewelry* (Gold/Silver/Platinum)\n2️⃣ *Exchange Old Jewel*\n3️⃣ *Talk to Sales Assistant*\n4️⃣ *Store Location*`, GREETING_IMG);
                return;
            }

            if (session.step === 'menu') {
                if (cleanInput.includes('1') || cleanInput.includes('buy') || detectMetal(cleanInput)) {
                    const metal = detectMetal(cleanInput);
                    if (metal) {
                        session.metalType = metal;
                        if (metal === 'Gold') {
                            await sendReply(From, "Select Purity:\n1️⃣ *22K (916)*\n2️⃣ *24K (999)*\n3️⃣ *18K*");
                            session.step = 'ask_karat';
                        } else {
                            const rates = await getLiveRates();
                            const rate = metal === 'Silver' ? rates.silver_gram_inr : rates.platinum_gram_inr;
                            await sendReply(From, `👍 *Buying ${metal}*\nRate: ₹${rate || 'Check Store'}/g\n\nPlease enter **weight (grams)**.`);
                            session.step = 'estimate_weight';
                        }
                    } else {
                        await sendReply(From, "What would you like to buy?\n\nType *Gold*, *Silver*, or *Platinum*.");
                        session.step = 'buy_category';
                    }
                } else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                    await sendReply(From, "What to exchange?\n\nType *Gold*, *Silver*, or *Platinum*.");
                    session.step = 'exchange_category';
                } else if (cleanInput.includes('3') || cleanInput.includes('sales')) {
                    session.mode = 'agent';
                    await sendReply(From, "👨‍💼 *Our sales expert will message you shortly.*");
                    notifyOwner(`Customer ${From} wants to chat!`, { customer: From });
                    await approvalService.create({ customer: From, type: 'support_request', status: 'pending_action', weight: 'N/A', estimatedCost: 'N/A' });
                } else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                    await sendReply(From, `📍 *Store Location*\n\n${db.settings.storeLocation}\n\n${db.settings.mapLink}`);
                }
            } else if (session.step === 'buy_category') {
                const metal = detectMetal(cleanInput);
                if (!metal) { await sendReply(From, "Please type *Gold*, *Silver*, or *Platinum*."); return; }
                session.metalType = metal;
                if (metal === 'Gold') {
                    await sendReply(From, "Select Purity:\n1️⃣ *22K (916)*\n2️⃣ *24K (999)*\n3️⃣ *18K*");
                    session.step = 'ask_karat';
                } else {
                    const rates = await getLiveRates();
                    const rate = metal === 'Silver' ? rates.silver_gram_inr : rates.platinum_gram_inr;
                    await sendReply(From, `👍 *Buying ${metal}*\nRate: ₹${rate || 'Check Store'}/g\n\nPlease enter **weight (grams)**.`);
                    session.step = 'estimate_weight';
                }
            } else if (session.step === 'ask_karat') {
                if (cleanInput.includes('22')) session.karat = '22K';
                else if (cleanInput.includes('24')) session.karat = '24K';
                else session.karat = '22K';
                const rates = await getLiveRates();
                await sendReply(From, `👍 *Buying Gold ${session.karat}*\nRate: ₹${rates.gold_gram_inr}/g\n\nPlease enter **weight (grams)**.`);
                session.step = 'estimate_weight';
            } else if (session.step === 'estimate_weight') {
                const weight = parseFloat(input);
                if (isNaN(weight)) { await sendReply(From, "Please enter a valid number (e.g. 10)."); return; }
                session.weight = weight;

                // Use the centralized Pricing Engine
                // Default: 15% Making, 3% GST
                const { finalPrice, rate } = await calculatePrice(session.metalType, session.weight);
                const cost = finalPrice;
                const threshold = db.settings.approvalThreshold || 20000;

                if (cost > threshold) {
                    const newReq = await approvalService.create({
                        customer: From,
                        type: 'estimate',
                        weight: session.weight,
                        estimatedCost: cost,
                        status: 'pending_approval',
                        metal: session.metalType || 'Gold',
                    });
                    db.save(); // SAVE
                    notifyOwner(`New Estimate (> ₹${threshold}):\n${session.weight}g ${session.metalType}\nApprox: ₹${cost}\n\n*Reply 'Approve <Amount>'*`, { customer: From, reqId: newReq.id });
                    await sendReply(From, `✅ *Request Received for ${session.weight}g ${session.metalType}*\n\nApprox Value: ~₹${cost}\n_(Includes 3% GST & Min Making Charges)_\n\n⚠️ *Note: Making charges & wastage vary from 5.5% to 35% based on design selection.*\n\nI have sent this to the owner for best price approval.`);
                } else {
                    await approvalService.create({ customer: From, type: 'estimate', weight: session.weight, estimatedCost: cost, status: 'approved', finalPrice: cost, metal: session.metalType });
                    db.save(); // SAVE
                    await sendReply(From, `💰 *Estimate*\n\nApprox cost: *₹${cost}*\n_(Includes 3% GST & Min Making Charges)_\n\n⚠️ *Note: Making charges & wastage vary from 5.5% to 35% based on design selection.*\n\nVisit our store to purchase!`);
                }
                session.step = 'menu';
            } else if (session.step === 'exchange_category') {
                const metal = detectMetal(cleanInput);
                if (metal) {
                    await sendReply(From, `*${metal} Exchange Process*:\n\n1. Purity Verification\n2. Net Weight Check\n3. Today's Rate Valuation\n\nVisit store for details.`);
                    session.step = 'menu';
                }
            }

        } catch (e) { console.error(e); }
    } catch (routeError) {
        console.error("Router Error:", routeError);
    }
});

module.exports = router;
