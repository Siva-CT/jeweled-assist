module.exports = {
    pendingApprovals: [], // Stores estimate requests
    nudgeList: [],        // Stores users to follow up
    // Default Settings
    settings: {
        storeLocation: "123 Gold Street, Market City, Chennai",
        ownerNumber: "919876543210",
        mapLink: "https://maps.google.com/?q=Jeweled+Showroom",
        approvalThreshold: 20000, // Auto-approve below this
        manualRates: {
            gold: 0,
            silver: 0,
            platinum: 0
        }
    },
    messages: [], // Store chat history for dashboard view
    sessions: {}, // Active user sessions (switched to DB for sharing)
    ownerContext: {} // Track who the owner is replying to
};
