import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  try {
    if (serviceAccount) {
      const cert = JSON.parse(serviceAccount.trim());
      admin.initializeApp({
        credential: admin.credential.cert(cert),
      });
    } else if (projectId && clientEmail && privateKey) {
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
  } catch (error: any) {
    console.error('Firebase admin initialization failed:', error);
    // Throw error so it's caught by the gateway
    throw new Error(`Firebase initialization error: ${error.message}`);
  }
}

export const db = (() => {
  if (admin.apps.length) return admin.firestore();
  throw new Error('Firebase Admin not initialized. Check environment variables.');
})() as admin.firestore.Firestore;
