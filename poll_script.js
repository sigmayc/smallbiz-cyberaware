const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cyberaware-smallbiz-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

async function poll() {
    try {
        const db = admin.database();

        // --- MOCK DATA TEST (Optional: Remove after testing) ---
        // const testId = "test_005";
        // const testRef = db.ref(`alerts/${testId}`);
        // const testSnap = await testRef.once('value');
        // if (!testSnap.exists()) {
        //     console.log("🛠️ Injecting test alert...");
        //     const mockAlert = {
        //         title: "Critical Vulnerability in Oracle Products",
        //         date: "22 January 2026",
        //         link: "https://www.csa.gov.sg/test-alert",
        //         description:"Oracle has released security updates to address a critical vulnerability affecting Oracle HTTP Server and WebLogic Server Proxy Plug-in. Users and administrators of affected products are advised to update the affected products to the latest version immediately."
        //     };
        //     await testRef.set(mockAlert);
        //     await sendNotification(mockAlert.title);
        // }
        // --- END TEST ---

        const { data } = await axios.get('https://www.csa.gov.sg/alerts-and-advisories/alerts', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const alertItems = $('.views-row').toArray(); // Convert to Array for 'for...of' loop
        console.log(`Found ${alertItems.length} alert items on the page.`);

        // USE FOR...OF INSTEAD OF .EACH FOR ASYNC/AWAIT
        for (const el of alertItems) {
            const title = $(el).find('.views-field-title').text().trim();
            const date = $(el).find('.views-field-created').text().trim();
            const link = "https://www.csa.gov.sg" + $(el).find('a').attr('href');
            
            const rawDescription = $(el).find('.views-field-field-summary').text().trim(); 
            const description = rawDescription || "Click the link to view full advisory details.";
            
            // Create a safe ID for Firebase
            const alertId = Buffer.from(title).toString('base64').substring(0, 20); 

            const alertRef = db.ref(`alerts/${alertId}`);
            const snapshot = await alertRef.once('value');

            if (!snapshot.exists()) {
                console.log(`🆕 New alert: ${title}`);
                await alertRef.set({ title, date, link, description });
                await sendNotification(title);
            }
        }

        console.log("✅ Script finished successfully.");
        process.exit(0); // Ensure the script closes cleanly

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

async function sendNotification(alertTitle) {
    const message = {
        notification: {
            title: '⚠️ New CSA Security Alert',
            body: alertTitle,
        },
        topic: 'cyber_alerts'
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent notification:', response);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

poll();
