/**
 * Phase 2 では ja / en の 2 言語のみサポート。
 * Phase 5 で vi / id / zh を追加する。Locale を増やすときはここと messages/ を同時に更新する。
 */
export const SUPPORTED_LOCALES = ["ja", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "ja";
export const LOCALE_COOKIE = "growlink_locale";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(input: string | null | undefined): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  // ja-JP のような Accept-Language も先頭 2 文字で受ける。
  const head = input.toLowerCase().split(/[-_]/)[0];
  if (isSupportedLocale(head)) return head;
  return DEFAULT_LOCALE;
}
