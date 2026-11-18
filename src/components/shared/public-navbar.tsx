'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { useI18n } from '@/lib/i18n';

export function PublicNavbar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/#features', label: t('nav.features') },
    { href: '/#how', label: t('nav.how') },
    { href: '/pricing', label: t('nav.pricing') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="DAYONE AI">
          <Logo size="md" />
          <span className="text-[15px] font-bold tracking-tight">
            DAYONE<span className="text-primary"> AI</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('nav.login')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t('nav.getStarted')}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3">
              <LanguageSwitcher />
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">{t('nav.getStarted')}</Link>
                </Button>
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
