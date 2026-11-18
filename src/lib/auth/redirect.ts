'use client';

import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase/client';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';
import { useI18n } from '@/lib/i18n';

/**
 * After a successful sign-in: send completed users to the dashboard (or the
 * requested ?next= route) and new users to onboarding. Also aligns the
 * interface language with the saved profile.
 */
export function usePostAuthRedirect() {
  const router = useRouter();
  const { setLang } = useI18n();

  return async (user: User, next: string | null): Promise<void> => {
    let done = false;
    const db = getFirestoreDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const profile = snap.exists() ? (snap.data() as UserProfile) : null;
        done = profile?.onboardingComplete === true;
        if (profile?.language && setLang) setLang(profile.language);
      } catch {
        done = false;
      }
    }
    if (done && next && next.startsWith('/') && !next.startsWith('//')) {
      router.push(next);
      return;
    }
    router.push(done ? '/dashboard' : '/onboarding');
  };
}
