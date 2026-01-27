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
            // GLOBAL RESET / START
            if (['hi', 'hello', 'start', 'menu', 'reset'].includes(cleanInput)) {
                session.step = 'menu';
                await sendReply(From, `💎 *Welcome to JeweledAssist*\n_Your personal jewellery concierge_\n\nHow can I help you today?\n\nPlease choose an option 👇\n\n1️⃣ 🛍️ *Buy Jewellery*\n2️⃣ ♻️ *Exchange Old Gold*\n3️⃣ 💬 *Get Expert Advice*\n4️⃣ 📍 *Store Location*`);
                return;
            }

            // --- STATE MACHINE ---

            /* 1. MAIN MENU */
            if (session.step === 'menu') {
                if (cleanInput.includes('1') || cleanInput.includes('buy')) {
                    // BUY FLOW
                    session.step = 'buy_category';
                    await sendReply(From, `🛍️ *Buy Jewellery*\n\nGreat choice ✨\nWhat are you looking for today?\n\n1️⃣ Bridal Jewellery 💍\n2️⃣ Daily Wear 📿\n3️⃣ Investment / Coins / Bars 🪙`);
                }
                else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                    // EXCHANGE FLOW
                    session.step = 'exchange_sub';
                    await sendReply(From, `♻️ *Exchange Old Gold*\n\nWe offer transparent exchange at live market rates 🔒\n\nPlease choose:\n\n1️⃣ Check today’s gold rate\n2️⃣ Book an exchange visit`);
                }
                else if (cleanInput.includes('3') || cleanInput.includes('advice')) {
                    // ADVICE FLOW
                    session.step = 'advice_sub';
                    await sendReply(From, `💬 *Get Expert Advice*\n\nHappy to help 😊\nWhat would you like to know?\n\n1️⃣ Gold & Silver prices\n2️⃣ Making charges & purity\n3️⃣ Bridal buying guidance`);
                }
                else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                    // LOCATION FLOW
                    session.step = 'location_ask_city';
                    await sendReply(From, `📍 *Store Location*\n\nTo help you better, which city are you coming from?`);
                }
                else {
                    await sendReply(From, "Please select an option (1-4). Type 'Menu' to restart.");
                }
            }

            /* 2. BUY SUB-FLOW */
            else if (session.step === 'buy_category') {
                let intent = '';
                if (cleanInput.includes('1') || cleanInput.includes('bridal')) intent = 'Bridal Jewellery';
                else if (cleanInput.includes('2') || cleanInput.includes('daily')) intent = 'Daily Wear';
                else if (cleanInput.includes('3') || cleanInput.includes('investment')) intent = 'Investment';
                else {
                    await sendReply(From, "Please select 1, 2, or 3."); return;
                }

                await sendReply(From, `You selected *${intent}* ✨`);

                // High Value Tagging
                if (intent === 'Bridal Jewellery' || intent === 'Investment') {
                    await approvalService.create({ customer: From, type: 'high_intent_lead', subtype: intent, status: 'pending_action', weight: 'N/A', estimatedCost: 'High Value' });
                    notifyOwner(`🔥 High Intent Lead: ${intent}`, { customer: From });
                }

                await sendReply(From, `Would you like me to connect you with our in-store jewellery expert for personalized designs?`, null);
                await sendReply(From, `Type *'Yes'* to chat with an expert, or *'Menu'* to go back.`);
                session.step = 'buy_handoff';
            }
            else if (session.step === 'buy_handoff') {
                if (cleanInput.includes('yes')) {
                    session.mode = 'agent';
                    await sendReply(From, `👨‍💼 *Request Sent*\n\nOur expert has been notified and will message you shortly to assist with your *${db.sessions[From].intent || 'request'}*.`);
                    notifyOwner(`Customer confirmed expert chat request.`, { customer: From });
                } else {
                    session.step = 'menu';
                    await sendReply(From, "No problem! You can browse our catalog or check rates anytime.\n\n🔄 *Type 'Menu' to start a new conversation*");
                }
            }

            /* 3. EXCHANGE SUB-FLOW */
            else if (session.step === 'exchange_sub') {
                if (cleanInput.includes('1') || cleanInput.includes('rate')) {
                    // Check Rate
                    const rates = await getLiveRates();
                    await sendReply(From, `📉 *Today's Exchange Rates*\n\nGold (22K): ₹${rates.gold_gram_inr}/g\nSilver: ₹${rates.silver_gram_inr}/g\n\n_Rates are subject to purity verification._\n\n✔ Live market pricing\n✔ Certified purity`);
                    await sendReply(From, "Would you like to book a visit? (Type Yes/No)");
                    session.step = 'exchange_book';
                } else if (cleanInput.includes('2') || cleanInput.includes('book')) {
                    // Book Visit
                    session.step = 'exchange_book_confirm';
                    await sendReply(From, "📅 *Book Exchange Visit*\n\nPlease type your preferred *Date & Time* (e.g., Tomorrow 11 AM).");
                } else {
                    await sendReply(From, "Please select 1 or 2.");
                }
            }
            else if (session.step === 'exchange_book') {
                if (cleanInput.includes('yes')) {
                    session.step = 'exchange_book_confirm';
                    await sendReply(From, "📅 *Book Exchange Visit*\n\nPlease type your preferred *Date & Time* (e.g., Tomorrow 11 AM).");
                } else {
                    session.step = 'menu';
                    await sendReply(From, "Understood. We are open Mon-Sat, 10 AM - 9 PM.\n\n🔄 *Type 'Menu' to start a new conversation*");
                }
            }
            else if (session.step === 'exchange_book_confirm') {
                await sendReply(From, `✅ *Visit Confirmed!*\n\nWe have scheduled your exchange visit for: *${input}*.\n\n📍 Location: ${db.settings.storeLocation}\n\nSee you soon!\n\n🔄 *Type 'Menu' to restart*`);
                notifyOwner(`📅 New Appointment: Exchange Visit at ${input}`, { customer: From });
                session.step = 'menu';
            }

            /* 4. ADVICE SUB-FLOW */
            else if (session.step === 'advice_sub') {
                if (cleanInput.includes('1') || cleanInput.includes('price')) {
                    const rates = await getLiveRates();
                    await sendReply(From, `📊 *Live Market Prices*\n\nGold (22K): ₹${rates.gold_gram_inr}/g\nSilver: ₹${rates.silver_gram_inr}/g\nUSD/INR: ₹${rates.usd_inr}\n\n✔ Live API Data`);
                } else if (cleanInput.includes('2') || cleanInput.includes('making')) {
                    await sendReply(From, `🛡️ *Transparancy Promise*\n\n• Making Charges: Start from 8%\n• Wastage: As per market standards\n• Purity: BIS Hallmarked (916)\n\nWe guarantee the best value for your old gold exchange.`);
                } else if (cleanInput.includes('3') || cleanInput.includes('bridal')) {
                    await sendReply(From, `👰 *Bridal Guidance*\n\nOur experts recommend starting planning 3-6 months ahead.\n\nWe specialize in:\n- Custom Temple Jewellery\n- Antique Finishes\n- Diamond Sets\n\nWould you like a consultation? (Type 'Yes')`);
                    session.step = 'buy_handoff'; // Reuse handoff
                    return;
                }
                await sendReply(From, "\n🔄 *Type 'Menu' to start a new conversation*");
                session.step = 'menu';
            }

            /* 5. LOCATION SUB-FLOW */
            else if (session.step === 'location_ask_city') {
                await sendReply(From, `📍 *Jeweled Showroom*\n\n123 Gold Street, Market City, Chennai\n\n🗺️ Map: ${db.settings.mapLink}\n\n🕒 Timings: 10:00 AM - 9:00 PM (Mon-Sat)\n🅿️ Valet Parking Available\n\nWe look forward to seeing you!\n\n🔄 *Type 'Menu' to restart*`);
                session.step = 'menu';
            }

        } catch (e) { console.error(e); }
    } catch (routeError) {
        console.error("Router Error:", routeError);
    }
});

module.exports = router;
