const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cyberaware-smallbiz-default-rtdb.asia-southeast1.firebasedatabase.app/" // Update this!
});

async function poll() {
  try {
    const { data } = await axios.get('https://www.csa.gov.sg/alerts-and-advisories/alerts', {
      headers: {
        // This is the most important part to bypass the 403 error
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      }
    });

    const $ = cheerio.load(data);
    const db = admin.database();
    
    // Add a check to see if we actually found items
    const alertItems = $('.views-row');
    console.log(`Found ${alertItems.length} alert items on the page.`);

    alertItems.each(async (i, el) => {
      // ... your existing extraction logic ...
    });

  } catch (error) {
    console.error("Error scraping:", error.message);
  }
}
poll();
async function sendNotification(alertTitle) {
  const message = {
    notification: {
      title: '⚠️ New CSA Security Alert',
      body: alertTitle,
    },
    topic: 'cyber_alerts' // This must match the topic in your Android app
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
