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
    }
};

module.exports = approvalService;
