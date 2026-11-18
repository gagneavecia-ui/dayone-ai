'use client';

import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';

export const SESSION_COOKIE = 'd1_session';

function setSessionCookie(token: string): void {
  try {
    document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=3600; samesite=lax`;
  } catch {
    /* cookies unavailable */
  }
}

export function clearSessionCookie(): void {
  try {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* cookies unavailable */
  }
}

function mapError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'errInvalidCredentials';
    case 'auth/email-already-in-use':
      return 'errEmailInUse';
    case 'auth/weak-password':
      return 'errWeakPassword';
    case 'auth/too-many-requests':
      return 'errTooManyRequests';
    default:
      return 'errGeneric';
  }
}

export class AuthError extends Error {
  i18nKey: string;
  constructor(i18nKey: string) {
    super(i18nKey);
    this.i18nKey = i18nKey;
  }
}

export function authReady(): boolean {
  return isFirebaseConfigured();
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError('firebaseMissing');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await sendEmailVerification(cred.user);
    setSessionCookie(await cred.user.getIdToken());
    return cred.user;
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    throw new AuthError(mapError(code));
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError('firebaseMissing');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setSessionCookie(await cred.user.getIdToken());
    return cred.user;
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    throw new AuthError(mapError(code));
  }
}

export async function loginGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError('firebaseMissing');
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    setSessionCookie(await cred.user.getIdToken());
    return cred.user;
  } catch (error) {
    const code = (error as { code?: string }).code ?? '';
    if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
      throw new AuthError('googleNotConfigured');
    }
    throw new AuthError(mapError(code));
  }
}

export async function resetPassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError('firebaseMissing');
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
  clearSessionCookie();
}

export async function deleteAuthUser(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new AuthError('sessionExpired');
  await deleteUser(user); // may throw auth/requires-recent-login
  clearSessionCookie();
}

/** Subscribes to token changes; keeps the session cookie fresh for middleware. */
export function watchSession(cb: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(null);
    return () => undefined;
  }
  return onIdTokenChanged(auth, (user) => {
    if (user) {
      user
        .getIdToken()
        .then(setSessionCookie)
        .catch(() => undefined);
    } else {
      clearSessionCookie();
    }
    cb(user);
  });
}

/** Returns the current ID token for API calls (throws when unavailable). */
export async function currentToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
