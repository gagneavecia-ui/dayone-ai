'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Language } from '@/types';
import { en, type Dict } from './en';
import { fr } from './fr';
import { es } from './es';
import { LANG_COOKIE, isLanguage } from './shared';

export const DICTS: Record<Language, Dict> = { en, fr, es };
export { LANG_COOKIE, isLanguage };

function resolve(dict: Dict, path: string): string | undefined {
  let cur: unknown = dict;
  for (const part of path.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ initialLang, children }: { initialLang: Language; children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      window.localStorage.setItem(LANG_COOKIE, next);
      document.documentElement.lang = next;
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let value = resolve(DICTS[lang], key) ?? resolve(en, key) ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) value = value.replace(`{${k}}`, String(v));
      }
      return value;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside LanguageProvider');
  return ctx;
}

/** Format a date string (YYYY-MM-DD or timestamp) for the current language. */
export function useDateFormatter() {
  const { lang } = useI18n();
  return useMemo(
    () => ({
      formatDate: (value: string | number) => {
        try {
          const date = typeof value === 'number' ? new Date(value) : new Date(`${value}T12:00:00`);
          return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-ES', {
            day: 'numeric',
            month: 'short',
          }).format(date);
        } catch {
          return String(value);
        }
      },
    }),
    [lang],
  );
}
