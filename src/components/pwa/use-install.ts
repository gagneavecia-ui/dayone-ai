'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA install prompt capture. Chromium exposes the native install prompt via
 * beforeinstallprompt; iOS Safari users install through the share menu.
 */
export function useInstallPwa() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    // Initial standalone check outside the synchronous effect body.
    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = () => setInstalled(mq.matches);
    mq.addEventListener('change', mqHandler);
    const initialCheck = setTimeout(mqHandler, 0);

    return () => {
      clearTimeout(initialCheck);
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      mq.removeEventListener('change', mqHandler);
    };
  }, []);

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!event) return 'unavailable';
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setEvent(null);
    return choice.outcome;
  }

  return { canInstall: Boolean(event), installed, install };
}
