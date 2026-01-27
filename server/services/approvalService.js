const db = require('../firebase');


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
 * Get Customer by Phone (Direct ID Lookup - No Index Needed)
 */
const getCustomer = async (phone) => {
    return safeRead(async () => {
        const doc = await db.collection('customers').doc(phone).get();
        return doc.exists ? doc.data() : null;
    }, null);
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
// Removed for production stability




// --- IN-MEMORY CACHE (Avoid Firestore Quota Exhaustion) ---
const sessionCache = new Map();
const customerCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 Seconds

// Periodic Cache Cleanup (Every 5 mins)
setInterval(() => {
    sessionCache.clear();
    customerCache.clear();
}, 5 * 60 * 1000);

// Helper for caching
const getFromCache = (cache, key) => {
    if (cache.has(key)) {
        const item = cache.get(key);
        if (Date.now() - item.ts < CACHE_TTL) return item.val;
        cache.delete(key);
    }
    return null;
};

const setCache = (cache, key, val) => {
    if (val) cache.set(key, { val, ts: Date.now() });
};

// ... (Existing exports below, methods updated)

module.exports = {
    create,
    getPending,
    approve,
    logMessage,
    updateCustomerActivity,
    getCustomer: async (phone) => {
        // Cache Check
        const cached = getFromCache(customerCache, phone);
        if (cached) return cached;

        return safeRead(async () => {
            const doc = await db.collection('customers').doc(phone).get();
            const data = doc.exists ? doc.data() : null;
            if (data) setCache(customerCache, phone, data);
            return data;
        }, null);
    },
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
    getSession: async (phone) => {
        // Cache Check
        const cached = getFromCache(sessionCache, phone);
        if (cached) return cached;

        return safeRead(async () => {
            const doc = await db.collection('sessions').doc(phone).get();
            const data = doc.exists ? doc.data() : null;
            if (data) setCache(sessionCache, phone, data);
            return data;
        }, null);
    },
    updateSession: async (phone, data) => {
        // Update Cache Immediately
        setCache(sessionCache, phone, { ...data, updatedAt: new Date() });
        try {
            await db.collection('sessions').doc(phone).set({
                ...data,
                updatedAt: new Date()
            }, { merge: true });
        } catch (e) {
            console.error("Session Update Error", e);
        }
    }
};
