const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initFirebase = () => {
    if (admin.apps.length > 0) return admin.firestore();

    let certConfig = null;
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            certConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log("🔥 Firebase: Loaded credentials from Environment Variable");
        } else {
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

// Singleton Export
const db = initFirebase();
module.exports = db;
