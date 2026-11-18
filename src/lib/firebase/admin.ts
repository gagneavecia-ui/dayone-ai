import 'server-only';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'dayone-admin';

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '';
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

/**
 * True when the Firebase Admin SDK service account is present in the server
 * environment. Without it, all privileged operations fail fast with a clear
 * error instead of pretending to work.
 */
export function isFirebaseAdminConfigured(): boolean {
  return Boolean(projectId && clientEmail && privateKey.includes('PRIVATE KEY'));
}

export function getFirebaseAdminApp(): App | null {
  if (!isFirebaseAdminConfigured()) return null;
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;
  return initializeApp(
    { credential: cert({ projectId, clientEmail, privateKey }) },
    ADMIN_APP_NAME,
  );
}

export function getAdminDb(): Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  if (app.name === ADMIN_APP_NAME) {
    return getFirestore(app);
  }
  const adminApp = getApp(ADMIN_APP_NAME);
  return getFirestore(adminApp);
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getAuth(app);
}
