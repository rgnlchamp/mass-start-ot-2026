
// Data Manager for switching between LocalStorage and Firebase
const DataManager = {
    mode: 'local', // 'local' or 'firebase'
    db: null,

    init: function () {
        // TODO: Replace with your actual Firebase project configuration
        // You can get this from the Firebase Console -> Project Settings -> General -> Your Apps
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY_HERE",
            authDomain: "your-project-id.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project-id.appspot.com",
            messagingSenderId: "SENDER_ID",
            appId: "APP_ID"
        };

        // Initialize Firebase if config is set (checking one key as a proxy)
        const isConfigured = firebaseConfig.projectId !== "your-project-id";

        if (isConfigured && typeof firebase !== 'undefined') {
            try {
                firebase.initializeApp(firebaseConfig);
                this.db = firebase.firestore();
                this.mode = 'firebase';
                console.log('✅ DataManager: Connected to Firebase');
            } catch (e) {
                console.error('❌ DataManager: Firebase Init Failed', e);
                this.mode = 'local';
            }
        } else {
            console.log('⚠️ DataManager: Using localStorage (Firebase not configured)');
            this.mode = 'local';
        }
    },

    // Load all app state
    load: async function () {
        if (this.mode === 'firebase') {
            try {
                const doc = await this.db.collection('olympic_trials').doc('global_state').get();
                if (doc.exists) {
                    console.log('📥 Data loaded from Cloud');
                    return doc.data();
                } else {
                    console.log('ℹ️ No cloud data found, starting fresh or local fallback.');
                    return null;
                }
            } catch (error) {
                console.error("Error getting cloud data:", error);
                return null;
            }
        } else {
            // LocalStorage
            const saved = localStorage.getItem('olympicTrials_v1');
            return saved ? JSON.parse(saved) : null;
        }
    },

    // Save all app state
    save: async function (data) {
        if (this.mode === 'firebase') {
            try {
                await this.db.collection('olympic_trials').doc('global_state').set(data);
                console.log("☁️ Saved to Cloud");
            } catch (error) {
                console.error("Error writing to cloud: ", error);
            }
        } else {
            localStorage.setItem('olympicTrials_v1', JSON.stringify(data));
        }
    }
};
