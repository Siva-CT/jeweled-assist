const db = require('../firebase');

const COLLECTION = 'approvals';

const approvalService = {
    /**
     * Create a new approval request
     * @param {Object} data { customer, weight, estimatedCost, type }
     */
    create: async (data) => {
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
    },

    /**
     * Get all pending approvals (Optimized Query)
     */
    getPending: async () => {
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
    },

    /**
     * Approve a request
     * @param {String} id Document ID
     * @param {Number} finalPrice 
     */
    approve: async (id, finalPrice) => {
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
    },

    /**
     * Log a chat message
     * @param {Object} msg { from, to, text }
     */
    logMessage: async (msg) => {
        try {
            await db.collection('messages').add({
                ...msg,
                timestamp: new Date()
            });
        } catch (e) {
            console.error("Firebase Message Log Error:", e);
        }
    },

    /**
     * Update Customer Activity
     */
    updateCustomerActivity: async (phone, lastText) => {
        try {
            await db.collection('customers').doc(phone).set({
                phone: phone,
                lastQuery: lastText,
                lastContact: new Date(),
                // simple counter increment is harder in stateless, we just touch update
                updatedAt: new Date()
            }, { merge: true });
        } catch (e) {
            console.error("Firebase Customer Update Error:", e);
        }
    },

    /**
     * Get Recent Customers
     */
    getRecentCustomers: async () => {
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
    },

    /**
     * Get chat history for a phone number
     */
    getChatHistory: async (phone) => {
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
    }
};

module.exports = approvalService;
