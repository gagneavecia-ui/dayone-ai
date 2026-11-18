'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  Compass,
  LayoutDashboard,
  ListChecks,
  Menu,
  NotebookPen,
  Settings,
  ShieldCheck,
  LogOut,
  Sparkles,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/shared/logo';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { logoutUser } from '@/lib/auth/client';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/goals', labelKey: 'nav.goals', icon: Target },
  { href: '/missions', labelKey: 'nav.missions', icon: ListChecks },
  { href: '/coach', labelKey: 'nav.coach', icon: Sparkles },
  { href: '/review', labelKey: 'nav.review', icon: CheckSquare },
  { href: '/progress', labelKey: 'nav.progress', icon: BarChart3 },
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

const MOBILE_NAV = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/missions', labelKey: 'nav.missions', icon: ListChecks },
  { href: '/coach', labelKey: 'nav.coach', icon: Sparkles },
  { href: '/review', labelKey: 'nav.review', icon: CheckSquare },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { role } = useAuth();
  const items = role === 'admin' || role === 'super_admin' ? [...NAV, { href: '/admin', labelKey: 'nav.admin', icon: ShieldCheck }] : NAV;

  return (
    <nav aria-label="Application" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active
                ? 'bg-primary/12 font-medium text-primary'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const router = useRouter();

  async function onSignOut() {
    await logoutUser();
    toast.success(t('nav.signOut'));
    router.push('/');
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <Link href="/dashboard" className="mb-4 mt-1 flex items-center gap-2.5" onClick={onNavigate}>
        <Logo size="md" />
        <span className="text-[15px] font-bold tracking-tight">
          DAYONE<span className="text-primary"> AI</span>
        </span>
      </Link>
      <div className="flex-1">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2 px-1">
          {profile ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {profile.plan === 'premium' ? t('common.premium') : t('common.free')}
            </Badge>
          ) : null}
          <LanguageSwitcher />
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('nav.signOut')}
        </Button>
      </div>
    </div>
  );
}

function OfflineBanner() {
  const { t } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="bg-muted border-b border-border px-4 py-2 text-center text-xs text-muted-foreground">
      {t('pwa.offlineBanner')}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useI18n();
  const router = useRouter();
  const { profile } = useAuth();

  async function onSignOut() {
    await logoutUser();
    toast.success(t('nav.signOut'));
    router.push('/');
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <OfflineBanner />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-sm font-bold">
            DAYONE<span className="text-primary"> AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {profile ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {profile.plan === 'premium' ? t('common.premium') : t('common.free')}
            </Badge>
          ) : null}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t('nav.more')}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-border bg-sidebar p-0">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('nav.more')}
                </SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <NavLinks onNavigate={() => setMoreOpen(false)} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full justify-start text-muted-foreground"
                  onClick={onSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('nav.signOut')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content */}
      <main className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {MOBILE_NAV.map((item) => (
          <MobileNavItem key={item.href} href={item.href} labelKey={item.labelKey} Icon={item.icon} />
        ))}
        <MobileNavItem href="/progress" labelKey="nav.progress" Icon={NotebookPen} />
      </nav>
    </div>
  );
}

function MobileNavItem({ href, labelKey, Icon }: { href: string; labelKey: string; Icon: typeof LayoutDashboard }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[52px] flex-col items-center justify-center gap-1 py-1.5 text-[10px]',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {t(labelKey)}
    </Link>
  );
}
