import { cookies } from "next/headers";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_LOCALES,
  type AdminLocale,
} from "@/lib/i18n/admin";

export function AdminTopBar({
  email,
  name,
  locale = "ja",
}: {
  email: string;
  name: string | null | undefined;
  locale?: AdminLocale;
}) {
  async function switchLocale(formData: FormData) {
    "use server";
    const next = String(formData.get("locale") ?? "ja");
    if ((ADMIN_LOCALES as string[]).includes(next)) {
      const store = await cookies();
      store.set(ADMIN_LOCALE_COOKIE, next, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-bold tracking-widest">TSUMUGI</span>
        <span className="text-xs text-muted-foreground">
          {locale === "en" ? "Admin" : "管理画面"}
        </span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2 text-sm">
        <form action={switchLocale} className="flex items-center gap-1">
          {ADMIN_LOCALES.map((l) => (
            <Button
              key={l}
              type="submit"
              name="locale"
              value={l}
              variant={l === locale ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
            >
              {l.toUpperCase()}
            </Button>
          ))}
        </form>
        <span className="text-muted-foreground">{name ?? email}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            {locale === "en" ? "Sign out" : "ログアウト"}
          </Button>
        </form>
      </div>
    </header>
  );
}
