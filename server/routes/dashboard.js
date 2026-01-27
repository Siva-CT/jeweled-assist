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
        // STRICT: Expert Advice Only
        const snapshot = await db.collection('conversations')
            .where('requires_owner_action', '==', true)
            .orderBy('last_message_at', 'desc')
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

        res.json(list);
    } catch (e) {
        console.error("Inbox Fetch Error:", e);
        // Fallback for missing index
        try {
            const snapshot2 = await db.collection('conversations')
                .where('requires_owner_action', '==', true)
                .limit(20)
                .get();
            res.json(snapshot2.docs.map(d => ({
                phone: d.id,
                lastIntent: d.data().intent,
                lastContact: new Date()
            })));
        } catch (e2) {
            res.json([]);
        }
    }
});

// Get All Customers - Disabled
router.get('/all-customers', (req, res) => res.json([]));



module.exports = router;
