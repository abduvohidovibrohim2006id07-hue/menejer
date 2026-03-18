import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDDWaEaJ5oMj9rJ\nbPYnwH4v20uxRCJSb7ytUqx3khFPNDLjHZl0AjR0Aq0mQ8q6i00exIVAwKTfP8Xu\n9T+xt8Og2VFvMkp11ZOWcYH2rJ7rLTKXvNaAEpSXtuyOaHQOIAcyCjKDOiTeJSIR\nBoFAvSGLcioaZIrYMD2au8q2o0KXodC47lXLoL3tyUXgoiuKpbFhwfZh9p4kFLUL\nIhHWQW7sn6ZPnz2uG8Q8arYuammWhk/sDU3kyRtcSVqYi37BoiS2Qd4KqifzFozD\nHmcAvvG7T/DA8jC4mBbV8D/vBxccVKedaazDogEIl4IohsFWqJvmIIG2AA1aJAY0\nLw4IDqq/AgMBAAECggEAH7WWzvYKrWtUaknDkyRN11rTaIzUvWjhyYiX8jjFkoO4\nluEhHZGWDha5IHL0n18pP4tKzf33RT3G1Uj9880OdjeQXmpdZ88pS8xU+kN+8FG/\n2p2Oe++IKzBIKb2OyRQt1tOM63wuq9h/NSBHLskEfuwjJXGYkAsUlN9Swl6x2obj\nBP9TxPdfGHw5HfPdlXRVOKoKZIj+1iqaP47BA8jbN8QIfxjvVnhMZP0nO+NTY5qj\nfQRgKjMS12zPQUdW7H7nZm3TAIkq1S4eoGvq/aUEu0lv88midoMSaSAjQJCZn4Bm\nBdSKcNqc7OOeH6+Gnr59YJHMgZJhUMznujF/Ka8BQQKBgQDnDA2LshxiAe3me5CB\nI3wNLyBiN2XCX1K0TQObG80dcQgTpHfaFyoO11AWWEPrp6CqQK8I3XjDITQfrWp/\nm0motUXqPqvWSz68qa+nJwtWlPEuoFMQgtn+ofNRamAdl3b0iAjx4uMOI+iz05nH\Qi8i1dwisIeVfVb+CgtWuwE7DwKBgQDYcqIbSW0ow2WDcIAJkjE6xUA8XU8UrXoK\nH7/T5M+xGc+veIkUxKCvovYKawA/Gh3V/+L7YHe8zyMfh98y8ODKCZ41xgV1Egqk\nYocqRmCfO8ic8S0NoOPB81ZMf3U0VKPPtwfgbvFYdUxnvJrQDnrRTqmcBDKoyBmX\nzeTsNwFVUQKBgGc1GBvt3QXerMGHMr6s9i4BfirBakBQSmZl/JVd7tsW8a+siSkv\nrcbhYVIJ7ZUn1PoYWNfR7q7jdyArW+ZSnK2zA98mTaY1CHpIJkG5jDQJ5k6YqWI3\nwV8gQst8hCDT1vxWhABhBGH9omYpwIikxN9/voz0ZCxfx+tE21nLwTn7AoGADUzF\n7z1MytNu2mvAQlZMVhsmvk7RfCjItfSLef62UGCQpWyXp8IJSaGO0scOZdI6ARtP\nHDkqQlzMALT9nwi0F1YN9ansTexE4SL4wT0/1Kj8w8ACD7NSK2nDZMH0Nrn4stvB\nTSYkCFZ00m8BaEVrgI7/1wle/4YEJJLPPUCIAXECgYBckr6JLaacf+XmbbmeJjdj\n4wwF6XCdGIZu7AfBF8ROSniR9gpMPXmd67cKiFRbrfzqbts/scKutt1wU3dMnuzy\n5BODVq0QSA8CLwnpfZYdtqYp+FJ/OKaBpddKkxe23AFRoUVaN6kVDNapydRe+p2t\ni5Fedh8dvUdD27xB8YsY1g==\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n');

if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: "photo-menejer",
            clientEmail: "firebase-adminsdk-fbsvc@photo-menejer.iam.gserviceaccount.com",
            privateKey: privateKey,
        }),
    });
}

const db = getFirestore();

const markets = [
    { id: 'uzum', name: 'Uzum Market', icon: 'U', color: '#7000FF', textColor: 'white' },
    { id: 'yandex', name: 'Yandex', icon: 'Y', color: '#FFCC00', textColor: 'black' },
    { id: 'olx', name: 'OLX', icon: 'olx', color: '#002f34', textColor: '#23e5db' },
    { id: 'wildberries', name: 'WB', icon: 'wb', color: '#cb11ab', textColor: 'white' },
    { id: 'instagram', name: 'Insta', icon: '📸', color: 'gradient', textColor: 'white' }
];

async function seed() {
    console.log("Seeding markets...");
    for (const market of markets) {
        await db.collection('markets').doc(market.id).set({
            ...market,
            updated_at: new Date().toISOString()
        });
        console.log(`Added: ${market.name}`);
    }
    console.log("Done!");
}

seed().catch(console.error);
