'use client';

import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { LanguageProvider } from '@/lib/i18n';
import { AuthProvider } from '@/components/providers/auth-provider';
import { RegisterServiceWorker } from '@/components/pwa/register-sw';

export function AppProviders({ initialLang, children }: { initialLang: 'en' | 'fr' | 'es'; children: ReactNode }) {
  return (
    <LanguageProvider initialLang={initialLang}>
      <AuthProvider>
        {children}
        <RegisterServiceWorker />
        <Toaster theme="dark" position="top-center" richColors closeButton />
      </AuthProvider>
    </LanguageProvider>
  );
}
