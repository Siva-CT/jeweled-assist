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

        // Note: Total Inquiries implies total chats, which is hard to count efficiently in Firestore without counters.
        // We'll use the legacy db.stats for now or 0 if empty.

        res.json({
            goldRate: rates.gold_gram_inr || 0,
            silverRate: rates.silver_gram_inr || 0,
            pendingCount: pending.length,
            qualifiedleads: pending.filter(p => p.status === 'approved').length, // This might be 0 if getPending only returns pending
            totalInquiries: db.stats.totalQueries || 0,
            lastUpdated: new Date()
        });
    } catch (e) {
        console.error("Stats Error:", e);
        res.status(500).json({ error: "Stats failed" });
    }
});

// Get Pending
router.get('/pending', async (req, res) => {
    try {
        const list = await approvalService.getPending();
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
});

// Approve Estimate
router.post('/approve', async (req, res) => {
    const { id, finalPrice } = req.body;
    try {
        const success = await approvalService.approve(id, finalPrice);

        if (!success) return res.status(404).json({ error: "Approval failed" });

        // We don't easily have the customer phone here unless we fetch the doc first.
        // For efficiency, we assume the frontend might pass it or we fetch it.
        // But approvalService.approve only updates.
        // Let's assume for now we just return success and let the owner manually reply if needed,
        // OR we update approvalService to return the doc.

        res.json({ success: true, id });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Trigger Nudge
router.post('/nudge', async (req, res) => {
    // Basic Nudge implementation assuming frontend passes Phone
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
router.post('/settings', (req, res) => {
    Object.assign(db.settings, req.body);
    db.save(); // SAVE
    res.json({ success: true, settings: db.settings });
});

// Get Settings
router.get('/settings', (req, res) => {
    res.json(db.settings);
});

// Toggle Bot Mode
router.post('/toggle-bot', (req, res) => {
    const { phone, mode } = req.body;
    if (!db.sessions[phone]) {
        db.sessions[phone] = { step: 'menu', mode: mode };
    } else {
        db.sessions[phone].mode = mode;
    }
    db.save(); // SAVE
    res.json({ success: true, mode: db.sessions[phone].mode });
});

// Get Bot Status
router.get('/bot-status/:phone', (req, res) => {
    const session = db.sessions[req.params.phone];
    res.json({ mode: session ? session.mode : 'bot' });
});

// Get All Customers
router.get('/all-customers', (req, res) => {
    // Return persistent customers list
    const list = Object.values(db.customers || {}).map(c => ({
        customer: c.phone,
        lastContact: c.lastContact,
        lastQuery: c.lastQuery || 'No interaction',
        msgCount: c.msgCount || 0
    }));
    res.json(list.sort((a, b) => new Date(b.lastContact) - new Date(a.lastContact)));
});

module.exports = router;
