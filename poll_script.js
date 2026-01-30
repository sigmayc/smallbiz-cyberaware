const Parser = require('rss-parser');
const admin = require('firebase-admin');
const parser = new Parser();

// Initialize Firebase with the secret key from GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com" // Change to your DB URL
});

async function poll() {
  const feed = await parser.parseURL('https://www.csa.gov.sg/rss/alerts');
  const db = admin.database();

  for (const item of feed.items) {
    const id = item.guid || item.title.replace(/\s+/g, '_');
    const ref = db.ref('alerts').child(id);
    
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) {
      await ref.set({
        title: item.title,
        description: item.contentSnippet,
        date: item.pubDate,
        link: item.link
      });
      console.log("Added new alert: " + item.title);
    }
  }
  process.exit();
}

poll();
