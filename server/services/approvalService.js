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
     * Get chat history for a phone number
     */
    getChatHistory: async (phone) => {
        try {
            // Complex query: get messages FROM customer OR TO customer
            // Firestore requires specific composite indexes for OR queries usually,
            // so we might do two queries and merge for simplicity if indexes are missing.
            // For now, let's assume we store them in a way that allows easy retrieval or just filtered on client.
            // Simplified: Query all messages where 'conversationId' matches (if we had one)
            // Or just fetch last 50 messages ordered by timestamp and filter in memory (efficient enough for small scale)

            const snapshot = await db.collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            const all = snapshot.docs.map(d => d.data());
            return all.filter(m => m.from === phone || m.to === phone).reverse();
        } catch (e) {
            console.error("Firebase History Error:", e);
            return [];
        }
    }
};

module.exports = approvalService;
