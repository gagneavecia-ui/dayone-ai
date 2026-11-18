import { cert, getApps, initializeApp } from 'firebase-admin/app';

/**
 * Promotes a user to admin / super admin and registers them in adminUsers.
 *
 * Usage:
 *   FIREBASE_ADMIN_PROJECT_ID=... FIREBASE_ADMIN_CLIENT_EMAIL=... \
 *   FIREBASE_ADMIN_PRIVATE_KEY="$(cat service-account.json | jq -r .private_key)" \
 *   node dayone-scripts/set-admin.mjs user@example.com admin
 */
const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email || !['admin', 'super_admin'].includes(role)) {
  console.error('Usage: node dayone-scripts/set-admin.mjs <email> <admin|super_admin>');
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey.includes('PRIVATE KEY')) {
  console.error('Missing FIREBASE_ADMIN_* environment variables.');
  process.exit(1);
}

const app =
  getApps().find((a) => a.name === 'dayone-admin') ??
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, 'dayone-admin');

const auth = app.auth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { role });
await app.firestore().collection('adminUsers').doc(user.uid).set({
  email: user.email,
  role,
  grantedAt: new Date().toISOString(),
}, { merge: true });

console.log(`OK — ${email} (${user.uid}) is now ${role}. Sign out and sign in again to refresh claims.`);
