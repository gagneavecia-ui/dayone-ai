'use client';

import { useI18n } from '@/lib/i18n';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
  { value: 'es', label: 'ES' },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cn('inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5', className)}
    >
      {LANGS.map((l) => (
        <button
          key={l.value}
          type="button"
          onClick={() => setLang(l.value)}
          aria-pressed={lang === l.value}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            lang === l.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
