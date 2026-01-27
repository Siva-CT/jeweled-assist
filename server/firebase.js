const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Priority:
// 1. Environment Variable (Render/Production)
// 2. Local File (Dev)
// 3. Default Google Cloud Creds

const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    let certConfig = null;

    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // Render puts the JSON in a string env var
            certConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log("🔥 Firebase: Loaded credentials from Environment Variable");
        } else {
            // Try local file lookup
            try {
                const serviceAccount = require('./service-account.json');
                certConfig = serviceAccount;
                console.log("🔥 Firebase: Loaded credentials from local file");
            } catch (e) {
                console.log("DATA INFO: No local service-account.json found. Trying default credentials.");
            }
        }

        if (certConfig) {
            admin.initializeApp({
                credential: admin.credential.cert(certConfig)
            });
        } else {
            // Default (e.g. if running on Google Cloud Platform directly)
            admin.initializeApp();
        }

        const db = admin.firestore();
        db.settings({ ignoreUndefinedProperties: true });
        console.log("✅ Firebase connection established");
        return db;

    } catch (error) {
        console.error("❌ Firebase Initialization Failed:", error.message);
        throw error;
    }
};

const db = initFirebase();

module.exports = db;
