const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Default Data Structure
const defaultData = {
    pendingApprovals: [],
    messages: [],
    sessions: {},
    ownerContext: {},
    settings: {
        storeLocation: "123 Gold Street, Market City, Chennai",
        ownerNumber: "919876543210", // Default placeholder
        mapLink: "https://maps.google.com/?q=Jeweled+Showroom",
        approvalThreshold: 20000,
        manualRates: { gold: 0, silver: 0, platinum: 0 }
    }
};

// Load Data
let data = { ...defaultData };
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        data = { ...defaultData, ...JSON.parse(fileContent) };
        // Merge nested settings to ensure new keys exist
        data.settings = { ...defaultData.settings, ...data.settings };
    } catch (e) {
        console.error("Failed to load database:", e);
    }
}

// Proxy to Auto-Save on Mutations (Simple Implementation)
// For meaningful changes, we should call db.save() explicitly in routes, 
// but this object will act as the in-memory cache.

const db = {
    ...data,
    save: () => {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify({
                pendingApprovals: db.pendingApprovals,
                messages: db.messages,
                sessions: db.sessions,
                ownerContext: db.ownerContext,
                settings: db.settings
            }, null, 2));
        } catch (e) {
            console.error("Failed to save database:", e);
        }
    }
};

// Initial Save to ensure file exists
db.save();

module.exports = db;
