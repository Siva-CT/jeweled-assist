require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../db');
const { getLiveRates } = require('../utils/pricingEngine');
const approvalService = require('../services/approvalService');

// Initialize Twilio
let client;
try {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } else {
        client = { messages: { create: async () => console.log("Mock Send") } };
    }
} catch (e) {
    client = { messages: { create: async () => console.log("Mock Send") } };
}

// Get Chat History
router.get('/chat/:phone', async (req, res) => {
    try {
        const history = await approvalService.getChatHistory(req.params.phone);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// Send Manual Message (Owner)
router.post('/send-message', async (req, res) => {
    const { phone, text } = req.body;
    try {
        await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: phone,
            body: text
        });
        // Log to Firestore
        await approvalService.logMessage({ from: 'owner', to: phone, text });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// Get Stats (Restored - Light & Safe)
router.get('/stats', async (req, res) => {
    try {
        const rates = await getLiveRates(); // Uses Memory Cache or Single API Call

        // 1. Action Required Count
        const actionSnap = await db.collection('conversations')
            .where('requires_owner_action', '==', true)
            .get();

        // 2. Total Inquiries (Capped at 101 for speed, returns "100+" if > 100)
        const totalSnap = await db.collection('conversations')
            .limit(101)
            .get();

        res.json({
            goldRate: rates?.gold_gram_inr || 7000,
            silverRate: rates?.silver_gram_inr || 90,
            pendingCount: 0,
            qualifiedleads: 0,
            totalInquiries: totalSnap.size > 100 ? "100+" : totalSnap.size, // Real count up to 100, then "100+"
            actionRequired: actionSnap.size,
            isManual: !!rates?.isManual,
            lastUpdated: new Date()
        });
    } catch (e) {
        console.error("Stats Error:", e);
        // Fallback checks
        res.json({
            goldRate: 7000,
            silverRate: 90,
            actionRequired: 0,
            totalInquiries: 0,
            lastUpdated: new Date()
        });
    }
});

// Get Pending (Approvals) - Disabled
router.get('/pending', (req, res) => res.json([]));

// Get Inbox (Restored - Active Only)
router.get('/inbox', async (req, res) => {
    try {
        // STRICT: Expert Advice Only (Index-Free Query)
        const snapshot = await db.collection('conversations')
            .where('requires_owner_action', '==', true)
            // .orderBy('last_message_at', 'desc') // REMOVED to prevent "Missing Index" error
            .limit(50)
            .get();

        const list = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                phone: doc.id,
                name: data.name || doc.id, // Fallback
                lastIntent: data.intent || data.last_intent || 'General',
                lastMessage: data.last_intent || 'User waiting...',
                lastContact: data.last_message_at?.toDate() || new Date(),
                status: 'Needs Action'
            };
        });

        // Sort in Memory (Safe & Fast for <50 items)
        list.sort((a, b) => b.lastContact - a.lastContact);

        res.json(list);
    } catch (e) {
        console.error("Inbox Fetch Error:", e);
        res.json([]);
    }
});

// Get All Customers - Disabled
router.get('/all-customers', (req, res) => res.json([]));


// --- RESTORED ROUTES ---

// Update Settings
router.post('/settings', async (req, res) => {
    try {
        await approvalService.updateStoreSettings(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Settings update failed" });
    }
});

// Get Settings (Fixed: Auto-Create Logic)
router.get('/settings', async (req, res) => {
    try {
        const settings = await approvalService.getStoreSettings();
        res.json(settings || {});
    } catch (e) {
        res.json({});
    }
});

// Toggle Bot Mode (With User Notification)
router.post('/toggle-bot', async (req, res) => {
    const { phone, mode } = req.body;
    try {
        // 1. Update Session Mode (RAM/DB)
        approvalService.updateSession(phone, { mode });

        // 2. Update Conversation Status (Inbox Visibility)
        const isBot = mode === 'bot';
        await approvalService.syncConversation(phone, {
            bot_enabled: isBot,
            requires_owner_action: !isBot, // If Bot, owner action done. If Agent, owner action needed? No, owner "taking over" usually implies active manual.
            // Actually: "Toggle to Bot" -> Owner finished. "Toggle to Human" -> Owner actively chatting.
            // When Toggling TO BOT: requires_owner_action = false (Remove from Inbox Needs Action)
            // When Toggling TO AGENT: requires_owner_action = false (It's active, but maybe "In Progress"? Dashboard query filters by requires_owner_action=true. 
            // If we assume "Needs Action" means "Unanswered Handoff", then flipping to Agent implies we ARE answerng.
            // So requires_owner_action = false in BOTH toggle cases is safest to clear the "Alert".
            requires_owner_action: false
        });

        // 3. Send Handoff Message (If switching TO Bot)
        if (isBot) {
            const menuText = `💎 *System Update*\n\nAutomated assistant is back online.\n\nType *0* for Main Menu.`;
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: phone,
                body: menuText
            });
            await approvalService.logMessage({ from: 'bot', to: phone, text: menuText });
        }

        res.json({ success: true, mode });
    } catch (e) {
        console.error("Toggle Bot Error:", e);
        res.status(500).json({ error: "Failed to toggle bot" });
    }
});

// Get Bot Status
router.get('/bot-status/:phone', async (req, res) => {
    const session = await approvalService.getSession(req.params.phone);
    res.json({ mode: session ? session.mode : 'bot' });
});

module.exports = router;
