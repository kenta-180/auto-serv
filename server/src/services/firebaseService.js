const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized || getApps().length > 0) {
    isInitialized = true;
    return;
  }

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      credential = cert(serviceAccount);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    }

    if (credential) {
      initializeApp({ credential });
      isInitialized = true;
      console.log('[Firebase Admin SDK] Successfully initialized with service account.');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'auto-serv-firestore';
      initializeApp({ projectId });
      isInitialized = true;
    }
  } catch (error) {
    console.error('[Firebase Admin Init Error]:', error.message);
  }
}

initFirebaseAdmin();

/**
 * Cryptographically verify Firebase ID Token server-side via Firebase Admin SDK
 * @param {string} idToken - Firebase ID token string from client
 * @returns {Promise<{ verified: boolean, uid: string, phoneNumber?: string, decodedToken?: object }>}
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Firebase ID Token is required for server-side verification.');
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      verified: true,
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
      email: decodedToken.email,
      decodedToken
    };
  } catch (error) {
    console.error('[Firebase Token Verification Failed]:', error.message);
    throw new Error(`Firebase ID Token verification failed: ${error.message}`);
  }
}

module.exports = {
  initFirebaseAdmin,
  verifyFirebaseIdToken,
  isFirebaseAdminInitialized: () => isInitialized || getApps().length > 0
};
