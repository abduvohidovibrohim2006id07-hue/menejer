import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (serviceAccount) {
      // Use the JSON service account string from Vercel/Env
      const cert = JSON.parse(serviceAccount.trim());
      admin.initializeApp({
        credential: admin.credential.cert(cert),
      });
    } else if (projectId && clientEmail && privateKey) {
      // Fallback to individual keys
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn('Firebase configuration missing (FIREBASE_SERVICE_ACCOUNT or individual keys).');
    }
  } catch (error) {
    console.error('Firebase admin initialization failed:', error);
  }
}

// Fixed type for Firestore to avoid "implicit any" in snapshot maps
export const db = (admin.apps.length ? admin.firestore() : (null as any)) as admin.firestore.Firestore;
