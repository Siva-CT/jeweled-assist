const db = require('../firebase');

const COLLECTION = 'approvals';

/**
 * Create a new approval request
 * @param {Object} data { customer, weight, estimatedCost, type }
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
        throw error;
    }
};

/**
 * Get all pending approvals (Optimized Query)
 */
const getPending = async () => {
    try {
        const snapshot = await db.collection(COLLECTION)
            .where('status', '==', 'pending_approval')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate() // Convert Timestamp
        }));
    } catch (error) {
        console.error("Firebase Read Error:", error);
        return [];
    }
};

/**
 * Approve a request
 * @param {String} id Document ID
 * @param {Number} finalPrice 
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
 * Log a chat message
 * @param {Object} msg { from, to, text }
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
 * Update Customer Activity
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
 * Get Recent Customers
 */
const getRecentCustomers = async () => {
    try {
        const snapshot = await db.collection('customers')
            .orderBy('lastContact', 'desc')
            .limit(10)
            .get();

        return snapshot.docs.map(doc => ({
            customer: doc.id,
            ...doc.data(),
            lastContact: doc.data().lastContact.toDate()
        }));
    } catch (e) {
        console.error("Firebase Customer Fetch Error:", e);
        return [];
    }
};

/**
 * Get chat history for a phone number
 */
const getChatHistory = async (phone) => {
    try {
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

        // Merge and Sort
        return all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (e) {
        // Fallback for missing indexes
        console.warn("Index missing, falling back to simple query", e);
        const snapshot = await db.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        const all = snapshot.docs.map(d => d.data());
        return all.filter(m => m.from === phone || m.to === phone).reverse();
    }
};

// --- INBOX FEATURES ---

/**
 * Get Inbox (Active Conversations)
 */
const getInbox = async () => {
    try {
        const snapshot = await db.collection('customers')
            .orderBy('lastContact', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => ({
            phone: doc.id,
            ...doc.data(),
            lastContact: doc.data().lastContact?.toDate()
        }));
    } catch (e) {
        console.error("Firebase Inbox Error:", e);
        return [];
    }
};

/**
 * Update Inbox Metadata (Intent, Action Required)
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

/**
 * Get Store Settings
 */
const getStoreSettings = async () => {
    try {
        const doc = await db.collection('config').doc('store_settings').get();
        return doc.exists ? doc.data() : null;
    } catch (e) { return null; }
};

const updateStoreSettings = async (data) => {
    await db.collection('config').doc('store_settings').set(data, { merge: true });
};

/**
 * Get Pricing Config
 */
const getPricingConfig = async () => {
    try {
        const doc = await db.collection('config').doc('pricing').get();
        return doc.exists ? doc.data() : { manualMode: false, manualRates: {} };
    } catch (e) { return { manualMode: false, manualRates: {} }; }
};

const updatePricingConfig = async (data) => {
    await db.collection('config').doc('pricing').set(data, { merge: true });
};

/**
 * Get Bot Status
 */
const getBotStatus = async () => {
    try {
        const doc = await db.collection('config').doc('bot_status').get();
        return doc.exists ? doc.data() : { active: true };
    } catch (e) { return { active: true }; }
};

const updateBotStatus = async (active) => {
    await db.collection('config').doc('bot_status').set({ active }, { merge: true });
};

/**
 * Placeholder for legacy compatibility if needed
 */
const getSettings = async () => {
    return getStoreSettings();
};
const updateSettings = async (data) => {
    return updateStoreSettings(data);
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
    updateSettings
};
