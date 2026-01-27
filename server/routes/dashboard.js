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

// Get Stats
router.get('/stats', async (req, res) => {
    try {
        const rates = await getLiveRates();
        const pending = await approvalService.getPending();

        // Defensive checks for rates
        const safeGold = rates?.gold_gram_inr || 0;
        const safeSilver = rates?.silver_gram_inr || 0;

        res.json({
            goldRate: safeGold,
            silverRate: safeSilver,
            pendingCount: pending.length,
            qualifiedleads: pending.filter(p => p.status === 'approved').length,
            totalInquiries: db.stats.totalQueries || 0,
            actionRequired: pending.length, // Heuristic for now
            isManual: !!rates?.isManual,
            lastUpdated: new Date()
        });
    } catch (e) {
        console.error("Stats Error:", e);
        // Return fail-safe defaults instead of 500 to keep dashboard alive
        res.json({
            goldRate: 0,
            silverRate: 0,
            pendingCount: 0,
            totalInquiries: 0,
            error: "Backend Error"
        });
    }
});

// Get Pending (Approvals)
router.get('/pending', async (req, res) => {
    try {
        const list = await approvalService.getPending();
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

// Get Inbox (Active Conversations) -- NEW FIX
router.get('/inbox', async (req, res) => {
    try {
        const list = await approvalService.getInbox();
        res.json(list);
    } catch (e) {
        console.error("Inbox Fetch Error:", e);
        res.status(500).json({ error: "Inbox fetch failed" });
    }
});


// Approve Estimate
router.post('/approve', async (req, res) => {
    const { id, finalPrice } = req.body;
    try {
        const success = await approvalService.approve(id, finalPrice);
        if (!success) return res.status(404).json({ error: "Approval failed" });
        res.json({ success: true, id });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Trigger Nudge
router.post('/nudge', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    try {
        await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: phone,
            body: `👋 *Just a gentle reminder!*\n\nWe are holding your special price estimate at Jeweled Showroom. When can we expect you?`
        });
        await approvalService.logMessage({ from: 'owner', to: phone, text: '[ACTION: NUDGE SENT]' });
        res.json({ success: true, message: "Nudge sent!" });
    } catch (err) {
        console.error("Twilio Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Settings
router.post('/settings', async (req, res) => {
    try {
        Object.assign(db.settings, req.body);
        db.save();
        await approvalService.updateStoreSettings(db.settings);
        res.json({ success: true, settings: db.settings });
    } catch (e) {
        res.status(500).json({ error: "Settings update failed" });
    }
});

// Get Settings
router.get('/settings', async (req, res) => {
    try {
        const remote = await approvalService.getStoreSettings();
        if (remote) {
            Object.assign(db.settings, remote);
            db.save();
        }
        res.json(db.settings || {});
    } catch (e) {
        res.json(db.settings || {});
    }
});

// Pricing Config (Separate Endpoint for clarity)
router.get('/settings/pricing', async (req, res) => {
    try {
        const config = await approvalService.getPricingConfig();
        res.json(config);
    } catch (e) { res.json({}); }
});

router.post('/settings/pricing', async (req, res) => {
    try {
        Object.assign(db.settings, req.body); // Sync local
        db.save();
        await approvalService.updatePricingConfig(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// Toggle Bot Mode
router.post('/toggle-bot', (req, res) => {
    const { phone, mode } = req.body;
    if (!db.sessions[phone]) {
        db.sessions[phone] = { step: 'menu', mode: mode };
    } else {
        db.sessions[phone].mode = mode;
    }
    db.save();
    res.json({ success: true, mode: db.sessions[phone].mode });
});

// Get Bot Status
router.get('/bot-status/:phone', (req, res) => {
    const session = db.sessions[req.params.phone];
    res.json({ mode: session ? session.mode : 'bot' });
});

// Get All Customers
router.get('/all-customers', async (req, res) => {
    try {
        const list = await approvalService.getRecentCustomers();
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});

module.exports = router;
