require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../db');
const { getLiveRates } = require('../utils/pricingEngine');

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
router.get('/chat/:phone', (req, res) => {
    const history = db.messages.filter(m => m.from === req.params.phone || m.to === req.params.phone);
    res.json(history);
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
        db.messages.push({ from: 'owner', to: phone, text, timestamp: new Date() });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// Get Stats
router.get('/stats', async (req, res) => {
    const rates = await getLiveRates();
    res.json({
        goldRate: rates.gold_gram_inr || 0,
        silverRate: rates.silver_gram_inr || 0,
        pendingCount: db.pendingApprovals.filter(p => p.status === 'pending_approval').length,
        qualifiedleads: db.pendingApprovals.length,
        lastUpdated: new Date()
    });
});

// Get Pending
router.get('/pending', (req, res) => {
    // Return ALL so frontend can filter
    res.json([...db.pendingApprovals].reverse());
});

// Approve Estimate
router.post('/approve', async (req, res) => {
    const { id, finalPrice } = req.body;
    const request = db.pendingApprovals.find(p => p.id === id);

    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = 'approved';
    request.finalPrice = finalPrice || request.estimatedCost;

    try {
        await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: request.customer,
            body: `🎉 *The owner has approved a special price for your request!*\n\nApprox Estimate: ₹${request.finalPrice}\n\nVisit our showroom today to finalize the design!`
        });
    } catch (err) {
        console.error("Twilio Error:", err);
    }
    res.json({ success: true, id });
});

// Trigger Nudge
router.post('/nudge', async (req, res) => {
    const { id, force } = req.body;
    const request = db.pendingApprovals.find(p => p.id === id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Send Message
    try {
        await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: request.customer,
            body: `👋 *Just a gentle reminder!*\n\nWe are holding your special price estimate at Jeweled Showroom. When can we expect you?`
        });
    } catch (err) {
        console.error("Twilio Error:", err);
    }

    res.json({ success: true, message: "Nudge sent!" });
});

// Update Settings
router.post('/settings', (req, res) => {
    Object.assign(db.settings, req.body);
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
    res.json({ success: true, mode: db.sessions[phone].mode });
});

// Get Bot Status
router.get('/bot-status/:phone', (req, res) => {
    const session = db.sessions[req.params.phone];
    res.json({ mode: session ? session.mode : 'bot' });
});

// Get All Customers
router.get('/all-customers', (req, res) => {
    const customers = {};
    db.messages.forEach(msg => {
        const phone = msg.from === 'bot' || msg.from === 'owner' || msg.from === 'system' ? msg.to : msg.from;
        if (phone === 'admin') return;
        if (!customers[phone]) {
            customers[phone] = { customer: phone, lastContact: msg.timestamp, msgCount: 0 };
        }
        customers[phone].msgCount++;
        if (new Date(msg.timestamp) > new Date(customers[phone].lastContact)) {
            customers[phone].lastContact = msg.timestamp;
            customers[phone].lastQuery = msg.text;
        }
    });
    res.json(Object.values(customers).sort((a, b) => new Date(b.lastContact) - new Date(a.lastContact)));
});

module.exports = router;
