const db = require('../firebase');
const PDFDocument = require('pdfkit'); // For PDF generation

const COLLECTION = 'approvals';

// --- SAFETY WRAPPERS ---
// Helper to safely execute Firestore reads without crashing
async function safeRead(operation, fallback = null) {
    try {
        return await operation();
    } catch (e) {
        console.error(`Firestore Read Error:`, e);
        return fallback;
    }
}

/**
 * Create a new approval request
 */
const create = async (data) => {
    try {
        const docRef = await db.collection(COLLECTION).add({
            ...data,
            status: 'pending_approval',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return { id: docRef.id, ...data };
    } catch (error) {
        console.error("Firebase Create Error:", error);
        // We throw here because creation failure is critical and caller handles it
        throw error;
    }
};

/**
 * Get all pending approvals (Optimized Query)
 */
const getPending = async () => {
    return safeRead(async () => {
        const snapshot = await db.collection(COLLECTION)
            .where('status', '==', 'pending_approval')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate()
        }));
    }, []);
};

/**
 * Approve a request
 */
const approve = async (id, finalPrice) => {
    try {
        await db.collection(COLLECTION).doc(id).update({
            status: 'approved',
            finalPrice: finalPrice,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error("Firebase Update Error:", error);
        return false;
    }
};

/**
 * Log a chat message (Fail-safe)
 */
const logMessage = async (msg) => {
    try {
        await db.collection('messages').add({
            ...msg,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Firebase Message Log Error:", e);
    }
};

/**
 * Update Customer Activity (Fail-safe)
 */
const updateCustomerActivity = async (phone, lastText) => {
    try {
        await db.collection('customers').doc(phone).set({
            phone: phone,
            lastQuery: lastText,
            lastContact: new Date(),
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Firebase Customer Update Error:", e);
    }
};

/**
 * Get Recent Customers (Fail-safe)
 */
const getRecentCustomers = async () => {
    return safeRead(async () => {
        const snapshot = await db.collection('customers')
            .orderBy('lastContact', 'desc')
            .limit(10)
            .get();

        return snapshot.docs.map(doc => ({
            customer: doc.id,
            ...doc.data(),
            lastContact: doc.data().lastContact.toDate()
        }));
    }, []);
};

/**
 * Get chat history for a phone number (Fail-safe)
 */
const getChatHistory = async (phone) => {
    return safeRead(async () => {
        // Fetch messages where 'from' is phone
        const msgFrom = await db.collection('messages')
            .where('from', '==', phone)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        // Fetch messages where 'to' is phone
        const msgTo = await db.collection('messages')
            .where('to', '==', phone)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        const all = [
            ...msgFrom.docs.map(d => d.data()),
            ...msgTo.docs.map(d => d.data())
        ];

        return all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, []);
};

/**
 * Get Inbox (Active Conversations) - CRITICAL SAFETY
 */
const getInbox = async () => {
    return safeRead(async () => {
        const snapshot = await db.collection('customers')
            .orderBy('lastContact', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => ({
            phone: doc.id,
            ...doc.data(),
            lastContact: doc.data().lastContact?.toDate()
        }));
    }, []);
};

/**
 * Update Inbox Metadata
 */
const updateInboxMetadata = async (phone, metadata) => {
    try {
        await db.collection('customers').doc(phone).set({
            ...metadata,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Firebase Inbox Update Error:", e);
    }
};

// --- CONFIGURATION FEATURES ---

const getStoreSettings = async () => {
    return safeRead(async () => {
        const doc = await db.collection('config').doc('store_settings').get();
        return doc.exists ? doc.data() : null;
    }, null);
};

const updateStoreSettings = async (data) => {
    try { await db.collection('config').doc('store_settings').set(data, { merge: true }); } catch (e) { console.error(e); }
};

const getPricingConfig = async () => {
    return safeRead(async () => {
        const doc = await db.collection('config').doc('pricing').get();
        return doc.exists ? doc.data() : { manualMode: false, manualRates: {} };
    }, { manualMode: false, manualRates: {} });
};

const updatePricingConfig = async (data) => {
    try { await db.collection('config').doc('pricing').set(data, { merge: true }); } catch (e) { console.error(e); }
};

const getBotStatus = async () => {
    return safeRead(async () => {
        const doc = await db.collection('config').doc('bot_status').get();
        return doc.exists ? doc.data() : { active: true };
    }, { active: true });
};

const updateBotStatus = async (active) => {
    try { await db.collection('config').doc('bot_status').set({ active }, { merge: true }); } catch (e) { console.error(e); }
};

const getSettings = async () => getStoreSettings();
const updateSettings = async (data) => updateStoreSettings(data);

// --- SESSION MANAGEMENT ---

const getSession = async (phone) => {
    return safeRead(async () => {
        const doc = await db.collection('sessions').doc(phone).get();
        return doc.exists ? doc.data() : null;
    }, null);
};

const updateSession = async (phone, data) => {
    try {
        await db.collection('sessions').doc(phone).set({
            ...data,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Session Update Error", e);
    }
};

// --- ANALYTICS ---

const incrementMonthlyQueries = async () => {
    const now = new Date();
    const monthKey = `enquiries_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    const statsRef = db.collection('analytics').doc('monthly');
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(statsRef);
            const current = doc.exists ? (doc.data()[monthKey] || 0) : 0;
            t.set(statsRef, { [monthKey]: current + 1 }, { merge: true });
        });
    } catch (e) { console.error("Analytics Inc Error", e); }
};

const getMonthlyStats = async () => {
    return safeRead(async () => {
        const now = new Date();
        const monthKey = `enquiries_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
        const doc = await db.collection('analytics').doc('monthly').get();
        return { totalQueries: doc.exists ? (doc.data()[monthKey] || 0) : 0 };
    }, { totalQueries: 0 });
};

const getMonthlyCustomerAnalytics = async () => {
    return safeRead(async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const snapshot = await db.collection('customers')
            .where('updatedAt', '>=', startOfMonth)
            .limit(20)
            .get();
        return snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                customer: doc.id,
                queriesThisMonth: 1,
                queryTypes: d.intent || 'General',
                storeVisit: d.storeVisitScheduled ? 'Yes' : 'No'
            };
        });
    }, []);
};

// --- PDF GENERATION ---
const generateCustomerPDF = async (phone, res) => {
    try {
        // Fetch Data
        const customerDoc = await safeRead(() => db.collection('customers').doc(phone).get());
        const customerData = customerDoc && customerDoc.exists ? customerDoc.data() : {};

        // Helper to check intent usage
        // We'll just list the last few intents from messages if we don't have aggregated fields
        // But for speed, let's use what we have in customerData (updated by whatsapp.js)

        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=customer_${phone}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('JeweledAssist - Customer Summary', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Customer Details
        doc.fontSize(14).text('Customer Details');
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold').text(`Phone Number: ${phone}`);
        doc.font('Helvetica').text(`Last Interaction: ${customerData.lastContact ? customerData.lastContact.toDate().toLocaleString() : 'N/A'}`);
        doc.text(`Store Visit Scheduled: ${customerData.storeVisitScheduled ? 'Yes' : 'No'}`);
        doc.moveDown();

        // Conversation Summary
        doc.fontSize(14).text('Conversation Summary');
        doc.moveDown(0.5);

        const intents = [];
        if (customerData.intent) intents.push(customerData.intent);
        // This is a basic export. In a real system we'd query all messages to find all intents.
        // For now, we list the LATEST known intent.
        doc.fontSize(12).text(`Latest Intent: ${customerData.intent || 'None'}`);

        doc.moveDown();

        // Latest Buy Request
        if (customerData.intent === 'buy_jewellery') {
            doc.fontSize(14).text('Latest Purchase Inquiry');
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Metal: ${customerData.metal || 'N/A'}`);
            doc.text(`Item: ${customerData.item_type || 'N/A'}`);
            doc.text(`Weight: ${customerData.grams || 0}g`);
            doc.text(`Price per Gram: ${customerData.price_per_gram || 'N/A'}`);
            doc.text(`Estimated Price: ${customerData.calculated_price || 'N/A'}`);
            doc.text(`Price Source: ${customerData.price_source || 'N/A'}`);
            doc.moveDown();
        }

        // Staff Notes (Placeholder)
        doc.fontSize(14).text('Staff Notes');
        doc.moveDown(0.5);
        doc.fontSize(12).text(customerData.notes || 'No notes available.');

        // Footer
        doc.moveDown(2);
        doc.fontSize(10).text('Source: JeweledAssist Admin Panel', { align: 'center', color: 'grey' });

        doc.end();
    } catch (e) {
        console.error("PDF Gen Error:", e);
        if (!res.headersSent) res.status(500).send("PDF Generation Failed");
    }
};

module.exports = {
    create,
    getPending,
    approve,
    logMessage,
    updateCustomerActivity,
    getRecentCustomers,
    getChatHistory,
    getInbox,
    updateInboxMetadata,
    getStoreSettings,
    updateStoreSettings,
    getPricingConfig,
    updatePricingConfig,
    getBotStatus,
    updateBotStatus,
    getSettings,
    updateSettings,
    getSession,
    updateSession,
    incrementMonthlyQueries,
    getMonthlyStats,
    getMonthlyCustomerAnalytics,
    generateCustomerPDF
};
