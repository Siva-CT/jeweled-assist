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




// --- IN-MEMORY CACHE (Primary State Store for Performance) ---
const sessionCache = new Map();
const customerCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 Minutes Session Timeout

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
    cache.set(key, { val, ts: Date.now() });
};

// ... (Existing exports below, methods updated)

module.exports = {
    create,
    getPending,
    approve,
    logMessage: async (msg) => {
        // Fire-and-Forget Log
        db.collection('messages').add({ ...msg, timestamp: new Date() }).catch(e => console.error("Log Error:", e.message));
    },
    updateCustomerActivity: async (phone, lastText) => {
        // Fire-and-Forget Update
        db.collection('customers').doc(phone).set({
            phone, lastQuery: lastText, lastContact: new Date(), updatedAt: new Date()
        }, { merge: true }).catch(e => console.error("Activity Update Error:", e.message));
    },
    // RAM-Only Accessor for Hot Path
    getInMemorySession: (phone) => {
        return getFromCache(sessionCache, phone) || null;
    },
    // RAM + Background Sync
    updateSession: (phone, data) => {
        // 1. Update RAM (Instant)
        setCache(sessionCache, phone, { ...data, updatedAt: new Date() });

        // 2. Fire-and-Forget Persist
        db.collection('sessions').doc(phone).set({
            ...data,
            updatedAt: new Date()
        }, { merge: true }).catch(e => console.error("Session Sync Error:", e.message));
    },
    // Legacy / Admin methods (can remain async/blocking if needed, but not for bot)
    getSession: async (phone) => {
        const cached = getFromCache(sessionCache, phone);
        if (cached) return cached;
        // Fallback to DB (Only for Admin/Debug, not Bot Loop)
        return safeRead(async () => {
            const doc = await db.collection('sessions').doc(phone).get();
            const data = doc.exists ? doc.data() : null;
            if (data) setCache(sessionCache, phone, data);
            return data;
        }, null);
    },
    getCustomer: async (phone) => {
        const cached = getFromCache(customerCache, phone);
        if (cached) return cached;
        // Optimization: For bot, we might skip this if strict speed needed
        // But for now, we'll keep the safe read with cache
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
    updateInboxMetadata: async (phone, metadata) => {
        db.collection('customers').doc(phone).set({ ...metadata, updatedAt: new Date() }, { merge: true })
            .catch(e => console.error("Inbox Meta Error:", e.message));
    },
    getStoreSettings,
    updateStoreSettings,
    getPricingConfig,
    updatePricingConfig,
    getBotStatus,
    updateBotStatus,
    getSettings,
    updateSettings,
    // --- DASHBOARD SYNC (FIRE-AND-FORGET) ---
    syncConversation: async (phone, data) => {
        // Write-Only: Powers the Inbox and Dashboard without blocking Reply
        db.collection('conversations').doc(phone).set({
            phone: phone,
            updatedAt: new Date(),
            ...data
        }, { merge: true }).catch(e => console.error("Sync Error:", e.message));
    }
};
