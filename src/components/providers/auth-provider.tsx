'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Role, UserProfile } from '@/types';
import { getFirestoreDb, isFirebaseConfigured } from '@/lib/firebase/client';
import { watchSession } from '@/lib/auth/client';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  profileLoaded: boolean;
  role: Role;
  loading: boolean;
  firebaseReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(isFirebaseConfigured());
  const [firebaseReady] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    if (!firebaseReady) return;
    let profileUnsub: Unsubscribe | null = null;

    const sessionUnsub = watchSession((nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (!nextUser) {
        setProfile(null);
        setProfileLoaded(true);
        setRole('user');
        profileUnsub?.();
        profileUnsub = null;
        return;
      }
      nextUser
        .getIdTokenResult()
        .then((result) => {
          const r = result.claims.role;
          setRole(r === 'admin' || r === 'super_admin' ? r : 'user');
        })
        .catch(() => setRole('user'));

      profileUnsub?.();
      const db = getFirestoreDb();
      if (!db) {
        setProfileLoaded(true);
        return;
      }
      profileUnsub = onSnapshot(
        doc(db, 'users', nextUser.uid),
        (snap) => {
          setProfile(snap.exists() ? ({ ...(snap.data() as UserProfile) } as UserProfile) : null);
          setProfileLoaded(true);
        },
        () => {
          setProfile(null);
          setProfileLoaded(true);
        },
      );
    });

    return () => {
      sessionUnsub();
      profileUnsub?.();
    };
  }, [firebaseReady]);

  const value = useMemo(
    () => ({ user, profile, profileLoaded, role, loading, firebaseReady }),
    [user, profile, profileLoaded, role, loading, firebaseReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
