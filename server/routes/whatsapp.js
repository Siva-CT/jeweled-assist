// Ensure env vars are loaded (redundant safety)
require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { getLiveRates, calculatePrice } = require('../utils/pricingEngine');
const db = require('../db');

// Initialize Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

// Helper: Send WhatsApp
async function sendReply(to, text, mediaUrl = null) {
    try {
        db.messages.push({ from: 'bot', to: to, text, timestamp: new Date() });
        const msgOptions = {
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: to,
            body: text
        };
        if (mediaUrl) msgOptions.mediaUrl = [mediaUrl];

        await client.messages.create(msgOptions);
    } catch (e) {
        console.error(`Twilio Failure to ${to}:`, e);
        // Log failure to DB for dashboard visibility
        db.messages.push({ from: 'system', to: 'admin', text: `Failed to send to ${to}: ${e.message}`, timestamp: new Date() });
    }
}

// OWNER HELPER: Send Notification to Owner
async function notifyOwner(message, context = {}) {
    // Save Context
    if (context.customer) {
        db.ownerContext = {
            customer: context.customer,
            reqId: context.reqId || db.ownerContext?.reqId
        };
    }
    const ownerNum = `whatsapp:${db.settings.ownerNumber}`; // e.g. 919876543210 -> whatsapp:919876543210
    // Ensure format
    if (!db.settings.ownerNumber) return;

    // Normalize format to include whatsapp: prefix if missing
    const to = db.settings.ownerNumber.startsWith('whatsapp:') ? db.settings.ownerNumber : `whatsapp:${db.settings.ownerNumber}`;

    try {
        await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: to,
            body: `🔔 *Owner Alert*\n\n${message}`
        });
    } catch (e) {
        console.error("Failed to notify owner:", e);
    }
}

// MAIN HANDLER
async function handleIncomingMessage(Body, From) {
    const input = Body?.trim();
    const cleanInput = input?.toLowerCase() || '';

    // --- OWNER CONTROL LOGIC ---
    // Helper to sanitize phone/whatsapp strings for comparison
    const normalize = (p) => p?.replace(/\D/g, '').slice(-10);

    // Check if sender matches the configured owner number (flexible match)
    const isOwner = normalize(From) === normalize(db.settings.ownerNumber);

    if (isOwner) {
        // --- OWNER COMMANDS ---
        const lastContext = db.ownerContext || {}; // { customer: '...', reqId: '...' }

        if (cleanInput.startsWith('approve')) {
            // Syntax: "Approve 15000" (uses last context) OR "Approve <Phone> <Price>"
            const parts = cleanInput.split(' ');
            const price = parts[1];

            if (!lastContext.reqId || !price) {
                await sendReply(From, "❌ usage: 'Approve <Amount>' (for last request)");
                return;
            }

            // Find request
            const reqItem = db.pendingApprovals.find(p => p.id === lastContext.reqId);
            if (reqItem) {
                reqItem.status = 'approved';
                reqItem.finalPrice = price;
                // Notify Customer
                await sendReply(reqItem.customer, `🎉 *The owner has approved a special price for your request!*\n\nApprox Estimate: ₹${price}\n\nVisit our showroom today to finalize the design!`);
                await sendReply(From, `✅ Approved request for ${reqItem.customer} at ₹${price}`);
            } else {
                await sendReply(From, "❌ Request ID not found or expired.");
            }
            return;

        } else if (cleanInput.startsWith('reply') || cleanInput.startsWith('chat')) {
            // Syntax: "Reply <Message>"
            const msg = input.substring(input.indexOf(' ') + 1);
            const target = lastContext.customer;

            if (!target) {
                await sendReply(From, "❌ No active customer context. Wait for a message.");
                return;
            }

            await sendReply(target, msg); // Send as Bot/Owner
            db.messages.push({ from: 'owner', to: target, text: msg, timestamp: new Date() });
            await sendReply(From, `📤 Sent to ${target}: "${msg}"`);
            return;

        } else if (cleanInput === 'status') {
            await sendReply(From, `📊 *System Status*\nPending IDs: ${db.pendingApprovals.filter(p => p.status === 'pending_approval').length}\nLast Active: ${lastContext.customer || 'None'}`);
            return;
        } else if (cleanInput === 'help') {
            await sendReply(From, "👨‍💻 *Owner Commands*\n\n- *Approve [Amount]*: Approve last estimate\n- *Reply [Msg]*: Message last customer\n- *Set Threshold [Val]*: Set approval limit\n- *Set Gold [Val]*: Set manual rate\n- *Status*: View stats");
            return;

        } else if (cleanInput.startsWith('set threshold')) {
            const val = parseInt(cleanInput.split(' ')[2]);
            if (val) {
                db.settings.approvalThreshold = val;
                await sendReply(From, `✅ Approval Threshold set to ₹${val}`);
            } else {
                await sendReply(From, "❌ Invalid value. Usage: Set threshold 20000");
            }
            return;

        } else if (cleanInput.startsWith('set gold')) {
            const val = parseInt(cleanInput.split(' ')[2]);
            if (val) {
                if (!db.settings.manualRates) db.settings.manualRates = {};
                db.settings.manualRates.gold = val;
                await sendReply(From, `✅ Manual Gold Rate set to ₹${val}/g`);
            } else {
                await sendReply(From, "❌ Invalid value. Usage: Set gold 7800");
            }
            return;
        }

        // Default: If not a command, treat as reply to last customer if valid
        if (lastContext.customer) {
            await sendReply(lastContext.customer, input);
            db.messages.push({ from: 'owner', to: lastContext.customer, text: input, timestamp: new Date() });
            await sendReply(From, `(Forwarded to ${lastContext.customer})`);
            return;
        }

        await sendReply(From, "🤖 Owner Mode. Type *Help* for commands.");
        return;
    }


    // --- CUSTOMER LOGIC ---

    // Init Session
    let session = db.sessions[From];
    if (!session) {
        session = { step: 'welcome', mode: 'bot' };
        db.sessions[From] = session;
    }

    // Logging
    db.messages.push({ from: From, to: 'admin', text: input, timestamp: new Date() });

    // AGENT MODE (Human Takeover)
    if (session.mode === 'agent') {
        // Trigger to resume bot
        if (cleanInput === 'bot' || cleanInput === 'menu') {
            session.mode = 'bot';
            session.step = 'menu';
            await sendReply(From, "🤖 *Bot Resumed*");
            return;
        }

        // Idle Timer
        if (idleTimers[From]) clearTimeout(idleTimers[From]);
        idleTimers[From] = setTimeout(() => {
            sendReply(From, `👋 *Session Closed*\n\nThank you for your enquiry. Feel free to visit us anytime.\n\n📍 ${db.settings.storeLocation}`);
            session.mode = 'bot';
        }, 10 * 60 * 1000); // 10 Min

        // Do nothing (wait for owner reply via dashboard)
        return;
    }

    try {
        // Global Reset
        if (['hi', 'hello', 'start', 'menu', 'reset'].includes(cleanInput)) {
            session.step = 'menu';
            await sendReply(From, `💎 *Welcome to JeweledAssist!* \n\nHow can I help you today?\n\n1️⃣ *Buy Jewelry* (Gold/Silver/Platinum)\n2️⃣ *Exchange Old Jewel*\n3️⃣ *Talk to Sales Assistant*\n4️⃣ *Store Location*`,
                'https://drive.google.com/uc?id=1XlsK-4OS5qrs87W9bRNwTXxxcilGgc3q'); // Image Added
            return;
        }

        if (session.step === 'menu') {
            if (cleanInput.includes('1') || cleanInput.includes('buy') || detectMetal(cleanInput)) {
                // If they typed "Buy Gold" directly
                const metal = detectMetal(cleanInput);
                if (metal) {
                    session.metalType = metal;
                    if (metal === 'Gold') {
                        await sendReply(From, "Select Purity:\n1️⃣ *22K (916)*\n2️⃣ *24K (999)*\n3️⃣ *18K*");
                        session.step = 'ask_karat';
                    } else {
                        // Silver/Platinum - Skip Karat
                        const rates = await getLiveRates();
                        await sendReply(From, `👍 *Buying ${metal}*\nRate: ₹${metal === 'Silver' ? rates.silver_gram_inr : rates.platinum_gram_inr || 'N/A'}/g\n\nPlease enter **weight (grams)**.`);
                        session.step = 'estimate_weight';
                    }
                } else {
                    await sendReply(From, "What would you like to buy?\n\nType *Gold*, *Silver*, or *Platinum*.");
                    session.step = 'buy_category';
                }
            } else if (cleanInput.includes('2') || cleanInput.includes('exchange')) {
                await sendReply(From, "What to exchange?\n\nType *Gold*, *Silver*, or *Platinum*.");
                session.step = 'exchange_category';
            } else if (cleanInput.includes('3') || cleanInput.includes('sales') || cleanInput.includes('talk')) {
                // SALES HANDOFF
                session.mode = 'agent';
                await sendReply(From, "👨‍💼 *Our sales expert will message you shortly.*");

                // Alert Owner
                notifyOwner(`Customer ${From} wants to chat!\nReply to start chatting.`, { customer: From });

                // Add to Pending
                db.pendingApprovals.push({
                    id: Date.now().toString(),
                    customer: From,
                    type: 'support_request',
                    status: 'pending_action',
                    timestamp: new Date(),
                    weight: 'N/A', budget: 'N/A'
                });

            } else if (cleanInput.includes('4') || cleanInput.includes('location')) {
                await sendReply(From, `📍 *Store Location*\n\n${db.settings.storeLocation}\n\n[Google Maps Link](${db.settings.mapLink})`);
            } else {
                await sendReply(From, "Please select an option or type *Gold*, *Sales*, etc.");
            }

        } else if (session.step === 'buy_category') {
            const metal = detectMetal(cleanInput);
            if (!metal) {
                await sendReply(From, "Please type *Gold*, *Silver*, or *Platinum*.");
                return;
            }
            session.metalType = metal;
            if (metal === 'Gold') {
                await sendReply(From, "Select Purity:\n1️⃣ *22K (916)*\n2️⃣ *24K (999)*\n3️⃣ *18K*");
                session.step = 'ask_karat';
            } else {
                const rates = await getLiveRates();
                await sendReply(From, `👍 *Buying ${metal}*\nRate: ₹${metal === 'Silver' ? rates.silver_gram_inr : 'N/A'}/g\n\nPlease enter **weight (grams)**.`);
                session.step = 'estimate_weight';
            }

        } else if (session.step === 'ask_karat') {
            if (cleanInput.includes('22') || cleanInput.includes('916') || cleanInput.includes('1')) {
                session.karat = '22K';
            } else if (cleanInput.includes('24') || cleanInput.includes('999') || cleanInput.includes('2')) {
                session.karat = '24K';
            } else if (cleanInput.includes('18') || cleanInput.includes('3')) {
                session.karat = '18K';
            } else {
                session.karat = '22K'; // Default
            }

            const rates = await getLiveRates();
            // Adjust rate based on Karat (rough logic, usually API gives 24k or 22k)
            let rate = rates.gold_gram_inr;

            // If manual rate is NOT set/detected as 24k, we might adjust?
            // For now just show the standard rate
            await sendReply(From, `👍 *Buying Gold ${session.karat}*\nRate: ₹${rate}/g\n\nPlease enter **weight (grams)**.`);
            session.step = 'estimate_weight';

        } else if (session.step === 'estimate_weight') {
            const weight = parseFloat(input);
            // Allow "10g" or "10 g"
            const cleanWeight = parseFloat(input.replace(/g/i, ''));

            if (isNaN(cleanWeight)) {
                await sendReply(From, "Please enter a valid number (e.g. 10).");
            } else {
                session.weight = cleanWeight;
                await sendReply(From, "What is your approximate budget?");
                session.step = 'estimate_budget';
            }

        } else if (session.step === 'estimate_budget') {
            session.budget = input;
            await sendReply(From, "When do you plan to purchase? (e.g. This Week)");
            session.step = 'estimate_timeline';

        } else if (session.step === 'estimate_timeline') {
            const roughCost = Math.round(session.weight * 7000 * 1.15); // Pseudo calc
            const threshold = db.settings.approvalThreshold || 20000;

            if (roughCost > threshold) {
                // HIGH VALUE: Ask Owner
                db.pendingApprovals.push({
                    id: Date.now().toString(),
                    customer: From,
                    type: 'estimate',
                    weight: session.weight,
                    budget: session.budget,
                    timeline: input,
                    estimatedCost: roughCost,
                    status: 'pending_approval',
                    metal: session.metalType || 'Gold',
                    timestamp: new Date()
                });

                // Alert Owner
                notifyOwner(
                    `New Estimate Request (> ₹${threshold}):\n${session.weight}g ${session.metalType} ${session.karat || ''}\nApprox: ₹${roughCost}\n\n*Reply 'Approve <Amount>'*`,
                    { customer: From, reqId: db.pendingApprovals[db.pendingApprovals.length - 1].id }
                );

                await sendReply(From, `✅ *Request Received for ${session.weight}g ${session.metalType}*\n\nApprox Value: ~₹${roughCost}\n\nI have sent this to the owner for best price approval. I will confirm shortly!`);
            } else {
                // LOW VALUE: Auto-Give Price
                // Log it as approved/completed automatically
                db.pendingApprovals.push({
                    id: Date.now().toString(),
                    customer: From,
                    type: 'estimate',
                    weight: session.weight,
                    budget: session.budget,
                    estimatedCost: roughCost,
                    status: 'approved', // Auto-approved
                    finalPrice: roughCost,
                    metal: session.metalType || 'Gold',
                    timestamp: new Date()
                });

                await sendReply(From, `💰 *Estimate*\n\nBased on today's rate, the approx cost for ${session.weight}g ${session.metalType} is *₹${roughCost}*.\n\nVisit our store to purchase!`);
            }
            session.step = 'menu';

        } else if (session.step === 'exchange_category') {
            // ... (Exchange logic similar to before but with detectMetal)
            const metal = detectMetal(cleanInput);
            if (metal) {
                await sendReply(From, `*${metal} Exchange Process*:\n\n1. Purity Check\n2. Net Weight\n3. Valuation\n\nVisit store for details.`);
                session.step = 'menu';
            } else {
                await sendReply(From, "Please type Gold, Silver or Platinum.");
            }
        } else {
            await sendReply(From, "Type *Menu* to start over.");
            session.step = 'menu';
        }

    } catch (e) {
        console.error("Logic Error:", e);
    }
}

router.post('/', (req, res) => {
    const { MessageSid, Body, From } = req.body;
    const twiml = new twilio.twiml.MessagingResponse();
    res.type('text/xml').send(twiml.toString());

    if (processedMessages.has(MessageSid)) return;
    processedMessages.add(MessageSid);

    handleIncomingMessage(Body, From);
});

module.exports = router;
