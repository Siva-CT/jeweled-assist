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

// Get Stats (Restored - Light Query)
router.get('/stats', async (req, res) => {
    try {
        const rates = await getLiveRates(); // Cached

        // Light Count Query (Requires Owner Action)
        const snapshot = await db.collection('conversations')
            .where('requires_owner_action', '==', true)
            .get();

        res.json({
            goldRate: rates?.gold_gram_inr || 0,
            silverRate: rates?.silver_gram_inr || 0,
            pendingCount: 0,
            qualifiedleads: 0,
            totalInquiries: 0, // Keep 0 to avoid heavy scan
            actionRequired: snapshot.size, // Real Count
            isManual: !!rates?.isManual,
            lastUpdated: new Date()
        });
    } catch (e) {
        res.json({ goldRate: 0, silverRate: 0, actionRequired: 0, lastUpdated: new Date() });
    }
});

// Get Pending (Approvals) - Disabled
router.get('/pending', (req, res) => res.json([]));

// Get Inbox (Restored - Active Conversations Only)
router.get('/inbox', async (req, res) => {
    try {
        const snapshot = await db.collection('conversations')
            .where('requires_owner_action', '==', true)
            .orderBy('createdAt', 'desc') // Ensure index exists or remove sort if error
            .limit(20)
            .get();

        const list = snapshot.docs.map(doc => ({
            phone: doc.id,
            ...doc.data(),
            lastContact: doc.data().last_message_at?.toDate()
        }));

        res.json(list);
    } catch (e) {
        console.error("Inbox Fetch Error:", e);
        // Fallback without sort if index missing
        try {
            const snapshot2 = await db.collection('conversations')
                .where('requires_owner_action', '==', true)
                .limit(20)
                .get();
            res.json(snapshot2.docs.map(d => ({ phone: d.id, ...d.data() })));
        } catch (e2) {
            res.json([]);
        }
    }
});

// Get All Customers - Disabled
router.get('/all-customers', (req, res) => res.json([]));



module.exports = router;
