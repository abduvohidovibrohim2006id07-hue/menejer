import { chromium } from 'playwright-chromium';
import { db } from './firebase-admin';

const LOGIN_URL = 'https://seller.uzum.uz/seller/signin';
const TARGET_URL = 'https://seller.uzum.uz/fbs-orders';
const API_HOST = 'api-seller.uzum.uz';

export async function refreshUzumToken(email: string, password: string, cabinetId: string) {
  console.log(`[Uzum Auth] Tokenni yangilash boshlandi: ${email}`);
  
  const browser = await chromium.launch({ 
    headless: true, // Serverda headless holda ishlaydi
    args: ['--disable-blink-features=AutomationControlled'] 
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    let bearerToken: string | null = null;

    const page = await context.newPage();

    // Requestni kuzatish (Token ushlash uchun)
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes(API_HOST)) {
        const headers = request.headers();
        const auth = headers['authorization'];
        if (auth && auth.startsWith('Bearer ')) {
          const token = auth.replace('Bearer ', '').trim();
          if (token && token.length > 50) { // Haqiqiy JWT token ekanligiga ishonch
            bearerToken = token;
          }
        }
      }
    });

    // 1. Login sahifasiga o'tish
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 2. Avtomatik Login (Python kodingizdagi logika Node.js da)
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill(email);
      await page.waitForTimeout(500);
      await inputs[1].fill(password);
      await page.waitForTimeout(1000);

      // Kirish tugmasini topish
      const buttons = await page.$$('button');
      let submitBtn = null;
      for (const btn of buttons) {
        const text = (await btn.innerText()).toLowerCase();
        if (text.includes('kirish') || text.includes('войти') || text.includes('login')) {
          submitBtn = btn;
          break;
        }
      }

      if (submitBtn) {
        await submitBtn.click();
        console.log('[Uzum Auth] Login tugmasi bosildi.');
      } else {
        await inputs[1].press('Enter');
      }
    }

    // 3. Login yakunlanishini kutish
    try {
      await page.waitForURL('**/seller.uzum.uz/**', { timeout: 15000 });
      await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
      console.log('[Uzum Auth] Login muvaffaqiyatli.');
    } catch (e) {
      console.log('[Uzum Auth] Login URL ga o\'tishda tanaffus (OTP kerak bo\'lishi mumkin).');
    }

    // 4. Token ushlangunicha biroz kutish (Python WAIT_SECONDS kabi)
    let retry = 0;
    while (!bearerToken && retry < 10) {
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      if (bearerToken) break;
      retry++;
    }

    if (bearerToken) {
      console.log('[Uzum Auth] Yangi Bearer Token ushlandi! ✅');
      
      // 5. FireBaseda tokenni yangilash
      const marketDoc = await db.collection('markets').doc('uzum').get();
      if (marketDoc.exists) {
        const data = marketDoc.data();
        const accounts = data?.accounts || [];
        
        // Tokenni to'g'ri akkaunt/kabinetga yozish
        let updated = false;
        accounts.forEach((acc: any) => {
          if (acc.email === email) {
            acc.cabinets?.forEach((cab: any) => {
              if (cab.id === cabinetId) {
                cab.bearer_token = bearerToken;
                updated = true;
              }
            });
          }
        });

        if (updated) {
          await db.collection('markets').doc('uzum').update({ accounts });
          console.log('[Uzum Auth] Firebase ma\'lumotlari yangilandi.');
        }
      }
      return bearerToken;
    } else {
      console.error('[Uzum Auth] Token ushlay olmadik. ❌');
      return null;
    }

  } catch (error) {
    console.error('[Uzum Auth] Xatolik:', error);
    return null;
  } finally {
    await browser.close();
  }
}
