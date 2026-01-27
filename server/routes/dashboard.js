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

// Get Stats (STATIC FOR STABILITY)
router.get('/stats', async (req, res) => {
    // Zero Reads. Just return status.
    res.json({
        goldRate: 0,
        silverRate: 0,
        pendingCount: 0,
        qualifiedleads: 0,
        totalInquiries: 0,
        actionRequired: 0,
        isManual: false,
        lastUpdated: new Date()
    });
});

// Get Pending (Approvals) - Disabled
router.get('/pending', (req, res) => res.json([]));

// Get Inbox - Disabled (Quota Safety)
router.get('/inbox', (req, res) => res.json([]));

// Get All Customers - Disabled
router.get('/all-customers', (req, res) => res.json([]));



module.exports = router;
