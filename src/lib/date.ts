/** Shared date helpers (client + server), timezone-aware. */

/** Returns YYYY-MM-DD in the given IANA timezone (en-CA locale format). */
export function localDateFor(timezone: string, at: Date = new Date()): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function weekdayLabel(date: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : 'es-ES', {
      weekday: 'short',
    }).format(new Date(`${date}T12:00:00Z`));
  } catch {
    return date;
  }
}

/** The last n dates, oldest first. */
export function lastNDates(n: number): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
