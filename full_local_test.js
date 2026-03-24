const axios = require('axios');
const admin = require('firebase-admin');
const { chromium } = require('playwright-chromium');
const fs = require('fs');
const path = require('path');

// Manually parse env file if dotenv fails
const envPath = path.join(__dirname, 'modern-version', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        let val = parts.slice(1).join('=').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        env[parts[0].trim()] = val;
    }
});

class UzumMarketAPI {
  constructor(bearerToken, shopId) {
    this.bearerToken = bearerToken;
    this.shopId = shopId;
    this.baseUrl = 'https://api-seller.uzum.uz';
  }
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      'Origin': 'https://seller.uzum.uz',
      'Accept-Language': 'uz-UZ'
    };
  }
  async getProduct(productId) {
    const response = await axios.get(`${this.baseUrl}/api/seller/shop/${this.shopId}/product`, {
      params: { productId },
      headers: this.getHeaders()
    });
    return response.data;
  }
}

async function refreshUzumToken(email, password) {
  console.log(`[Test] Login urunish: ${email}`);
  const browser = await chromium.launch({ headless: false }); // Headless: false so we can see
  try {
    const context = await browser.newContext();
    let bearerToken = null;
    const page = await context.newPage();
    page.on('request', (req) => {
      const auth = req.headers()['authorization'];
      if (auth && auth.startsWith('Bearer ')) {
         const t = auth.replace('Bearer ', '').trim();
         if (t.length > 100) bearerToken = t;
      }
    });

    await page.goto('https://seller.uzum.uz/seller/signin', { waitUntil: 'networkidle' });
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill(email);
      await inputs[1].fill(password);
      await page.keyboard.press('Enter');
    }

    console.log("Kutilmoqda (45 soniya)... OTP bo'lsa kiriting.");
    let retry = 0;
    while (!bearerToken && retry < 22) {
      await page.waitForTimeout(2000);
      if (bearerToken) break;
      retry++;
    }
    return bearerToken;
  } finally {
    await browser.close();
  }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}
const db = admin.firestore();

async function start() {
    const productId = "10013";
    console.log("--- LOKAL TEST ---");
    
    const marketDoc = await db.collection('markets').doc('uzum').get();
    const marketData = marketDoc.data();
    const account = marketData.accounts[0];
    
    console.log(`Step 1: Auth...`);
    const newToken = await refreshUzumToken(account.email, account.password);
    
    if (newToken) {
        console.log("✅ Token OK!");
        const uzum = new UzumMarketAPI(newToken, '2175378');
        const uzumProduct = await uzum.getProduct(2175378); // Using cabinet ID as product ID for test if needed or real ID
        console.log(`✅ Uzum connect OK: ${uzumProduct.title.uz}`);
    } else {
        console.error("❌ Token olib bo'lmadi.");
    }
}

start();
