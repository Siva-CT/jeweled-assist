const express = require('express');
const router = express.Router();
const db = require('../db');
const { getLiveRates } = require('../utils/pricingEngine');
const twilio = require('twilio');

// Initialize Twilio Client (ensure env vars are set)
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

// Get Stats (Gold Rate, Activity)
router.get('/stats', async (req, res) => {
    // getLiveRates returns { gold_gram_inr: 1234, ... }
    const rates = await getLiveRates();
    // Fallback if rates failed (status != 'success')
    const goldRate = rates.gold_gram_inr || 0;
    const silverRate = rates.silver_gram_inr || 0;

    res.json({
        goldRate: goldRate,
        silverRate: silverRate,
        pendingCount: db.pendingApprovals.filter(p => p.status === 'pending_approval').length,
        qualifiedleads: db.pendingApprovals.length, // Total requests
        lastUpdated: new Date()
    });
});

// Get Pending Approvals (Return ALL for client-side filtering)
router.get('/pending', (req, res) => {
    const pending = [...db.pendingApprovals].reverse(); // Newest first
    res.json(pending);
});

// Approve Estimate
router.post('/approve', async (req, res) => {
    const { id, finalPrice } = req.body;
    const request = db.pendingApprovals.find(p => p.id === id);

    if (!request) {
        return res.status(404).json({ error: "Request not found" });
    }

    request.status = 'approved';
    request.finalPrice = finalPrice || request.estimatedCost;

    // Send WhatsApp Notification
    try {
        if (process.env.TWILIO_PHONE_NUMBER) {
            // 1. Notify Customer
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: request.customer,
                body: `🎉 *The owner has approved a special price for your request!*\n\nApprox Estimate: ₹${request.finalPrice}\n\nVisit our showroom today to finalize the design!`
            });

            // 2. Notify Owner (Mirroring)
        } else {
            console.log("Twilio mocked: Message would be sent to", request.customer);
        }
    } catch (err) {
        console.error("Twilio Error:", err);
    }

    res.json({ success: true, id });
});

// Get Nudge List
router.get('/nudge-list', (req, res) => {
    // Find customers who haven't responded in 24h
    // For this demo, we'll simulate logic:
    // Any approved request older than 24h (or customized via "test nudge") is a nudge candidate
    // Actually, let's just use the `nudgeList` from DB or derive it.

    // Demo Logic: Treat any 'approved' request as a nudge candidate for demo purposes if we want to show UI.
    // Or we keep a separate list.
    // Let's derive it from pendingApprovals that are approved but no visit logged?
    const candidates = db.pendingApprovals.filter(p => p.status === 'approved');
    res.json(candidates);
});

// Trigger Nudge
router.post('/nudge', async (req, res) => {
    const { id, force } = req.body;
    const request = db.pendingApprovals.find(p => p.id === id);

    if (!request) return res.status(404).json({ error: "Request not found" });

    // Check time if not forced
    const now = new Date();
    const approvedTime = request.timestamp; // Using creation time as proxy for now
    const hoursDiff = (now - new Date(approvedTime)) / (1000 * 60 * 60);

    if (!force && hoursDiff < 24) {
        return res.status(400).json({ error: "Too early to nudge (wait 24h or use Force)" });
    }

    // Send Message
    try {
        if (process.env.TWILIO_PHONE_NUMBER) {
            await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                to: request.customer,
                body: `👋 *Just a gentle reminder!*\n\nWe are holding your special price estimate at Jeweled Showroom. When can we expect you?`
            });
        } else {
            console.log("Twilio Nudge Mocked:", request.customer);
        }
    } catch (err) {
        console.error("Twilio Error:", err);
    }

    res.json({ success: true, message: "Nudge sent!" });
});

// Update Settings
router.post('/settings', (req, res) => {
    const { storeLocation, ownerNumber, manualRates, approvalThreshold } = req.body;
    if (storeLocation) db.settings.storeLocation = storeLocation;
    if (ownerNumber) db.settings.ownerNumber = ownerNumber;
    if (approvalThreshold) db.settings.approvalThreshold = parseInt(approvalThreshold);
    if (manualRates) {
        db.settings.manualRates = { ...db.settings.manualRates, ...manualRates };
    }
    res.json({ success: true, settings: db.settings });
});

// Get Settings
router.get('/settings', (req, res) => {
    res.json(db.settings);
});

// Toggle Bot Mode
router.post('/toggle-bot', (req, res) => {
    const { phone, mode } = req.body; // mode: 'bot' or 'agent'
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

// Get All Customers (Aggregated from Messages)
router.get('/all-customers', (req, res) => {
    const customers = {};

    // Scan all messages to find unique interactions
    db.messages.forEach(msg => {
        const phone = msg.from === 'bot' || msg.from === 'owner' || msg.from === 'system' ? msg.to : msg.from;
        if (phone === 'admin') return; // Skip internal logs

        if (!customers[phone]) {
            customers[phone] = {
                customer: phone,
                lastContact: msg.timestamp,
                msgCount: 0,
                lastQuery: ''
            };
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
