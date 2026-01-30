const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com" // Update this!
});

async function poll() {
  try {
    const { data } = await axios.get('https://www.csa.gov.sg/alerts-and-advisories/alerts');
    const $ = cheerio.load(data);
    const db = admin.database();

    // Look for the alert items in the list
    $('.views-row').each(async (i, el) => {
      const title = $(el).find('.views-field-title').text().trim();
      const date = $(el).find('.views-field-created').text().trim();
      const link = "https://www.csa.gov.sg" + $(el).find('a').attr('href');
      
      if (title) {
        const id = title.replace(/[.#$/[\]]/g, "_");
        const ref = db.ref('alerts').child(id);
        const snapshot = await ref.once('value');
        
        if (!snapshot.exists()) {
          await ref.set({ title, date, link });
          console.log("Added: " + title);
        }
      }
    });
  } catch (error) {
    console.error("Error scraping:", error);
  }
}
poll();
