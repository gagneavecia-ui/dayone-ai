import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-base',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-xl border border-primary/40 bg-primary/10 font-bold tracking-tight text-primary shadow-[0_0_18px_rgba(139,92,246,0.25)]',
        SIZES[size],
        className,
      )}
    >
      D1
    </span>
  );
}
