import "server-only";

import { cookies, headers } from "next/headers";

import ja from "@/../messages/ja.json";
import en from "@/../messages/en.json";
import vi from "@/../messages/vi.json";
import id from "@/../messages/id.json";
import zh from "@/../messages/zh.json";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
  type SupportedLocale,
} from "./config";

const ALL_MESSAGES: Record<SupportedLocale, Record<string, unknown>> = { ja, en, vi, id, zh };

/**
 * Cookie → Accept-Language → DEFAULT_LOCALE の優先順で locale を解決する。
 * Server Component から呼ぶ前提。
 */
export async function getLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return resolveLocale(fromCookie);
  const h = await headers();
  return resolveLocale(h.get("accept-language"));
}

export function getMessages(locale: SupportedLocale): Record<string, unknown> {
  return ALL_MESSAGES[locale] ?? ALL_MESSAGES[DEFAULT_LOCALE];
}

export async function loadMessagesForCurrentLocale(): Promise<{
  locale: SupportedLocale;
  messages: Record<string, unknown>;
}> {
  const locale = await getLocale();
  return { locale, messages: getMessages(locale) };
}
