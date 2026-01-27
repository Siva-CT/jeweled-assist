const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const BACKUP_FILE = path.join(DATA_DIR, 'store.backup.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error("Failed to create data dir:", e);
    }
}

// Default Data Structure
const defaultData = {
    pendingApprovals: [],
    messages: [],
    sessions: {},
    ownerContext: {},
    settings: {
        storeLocation: "123 Gold Street, Market City, Chennai",
        ownerNumber: "919876543210",
        mapLink: "https://maps.google.com/?q=Jeweled+Showroom",
        approvalThreshold: 20000,
        manualRates: { gold: 0, silver: 0, platinum: 0 }
    },
    stats: {
        totalQueries: 0,
        lastRun: null
    },
    customers: {}
};

// Load Data with Backup Fallback
let data = { ...defaultData };

function loadFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(fileContent);
        }
    } catch (e) {
        console.error(`Failed to load ${filePath}:`, e);
        return null;
    }
    return null;
}

const loadedData = loadFile(DATA_FILE) || loadFile(BACKUP_FILE);

if (loadedData) {
    data = { ...defaultData, ...loadedData };
    // Deep merge settings
    data.settings = { ...defaultData.settings, ...data.settings };
    if (loadedData.manualRates) {
        data.settings.manualRates = { ...defaultData.settings.manualRates, ...loadedData.manualRates };
    }
    // Merge stats
    data.stats = { ...defaultData.stats, ...(data.stats || {}) };
    // Merge customers
    data.customers = { ...defaultData.customers, ...(data.customers || {}) };
}

const db = {
    ...data,
    prune: () => {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const now = Date.now();

        // Keep messages only if they are < 24 hours old OR belong to a pending approval/customer
        const activeCustomers = new Set(db.pendingApprovals.map(p => p.customer));
        // Add owner context customer to safe list
        if (db.ownerContext?.customer) activeCustomers.add(db.ownerContext.customer);

        const initialCount = db.messages.length;
        db.messages = db.messages.filter(msg => {
            const isFresh = (now - new Date(msg.timestamp).getTime()) < ONE_DAY;
            return isFresh || activeCustomers.has(msg.from) || activeCustomers.has(msg.to);
        });

        if (initialCount !== db.messages.length) {
            console.log(`🧹 Pruned ${initialCount - db.messages.length} old messages.`);
            db.save();
        }
    },
    clearChat: (phone) => {
        const initialCount = db.messages.length;
        // Keep messages that are NOT from/to this phone
        db.messages = db.messages.filter(msg => msg.from !== phone && msg.to !== phone);

        if (initialCount !== db.messages.length) {
            console.log(`🗑️ Cleared ${initialCount - db.messages.length} messages for ${phone} (Memory Saved)`);
            db.save();
        }
    },
    save: () => {
        try {
            const content = JSON.stringify({
                pendingApprovals: db.pendingApprovals,
                messages: db.messages,
                sessions: db.sessions,
                ownerContext: db.ownerContext,
                settings: db.settings,
                stats: db.stats,
                customers: db.customers
            }, null, 2);

            // 1. Write to backup first
            fs.writeFileSync(BACKUP_FILE, content);

            // 2. Write to main file
            fs.writeFileSync(DATA_FILE, content);

        } catch (e) {
            console.error("Failed to save database:", e);
        }
    }
};

// Initial Save if empty
if (!loadedData) db.save();

module.exports = db;
