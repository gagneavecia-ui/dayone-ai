// Shared i18n constants — importable from both server and client code.
export const LANG_COOKIE = 'd1_lang';

export function isLanguage(value: string | undefined | null): value is 'en' | 'fr' | 'es' {
  return value === 'en' || value === 'fr' || value === 'es';
}
