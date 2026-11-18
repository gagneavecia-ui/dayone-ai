'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';

/**
 * Registers the PWA service worker and surfaces update notifications.
 * Skips gracefully when service workers are unavailable (older browsers,
 * preview sandboxes).
 */
export function RegisterServiceWorker() {
  const { t } = useI18n();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production' && window.location.hostname === 'localhost') {
      // Avoid stale caches during development.
      return;
    }
    let registration: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg;
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              toast(t('pwa.swUpdated'), {
                action: { label: t('pwa.reload'), onClick: () => window.location.reload() },
                duration: 8000,
              });
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      registration = null;
    };
  }, [t]);

  return null;
}
