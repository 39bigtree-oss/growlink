import "server-only";

import { cookies } from "next/headers";

import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_LOCALES,
  DEFAULT_ADMIN_LOCALE,
  type AdminLocale,
} from "./admin";

export async function getAdminLocale(): Promise<AdminLocale> {
  const store = await cookies();
  const v = store.get(ADMIN_LOCALE_COOKIE)?.value;
  if (v && (ADMIN_LOCALES as string[]).includes(v)) return v as AdminLocale;
  return DEFAULT_ADMIN_LOCALE;
}
