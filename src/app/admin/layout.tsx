import type { ReactNode } from "react";

import { requireAdminSession } from "@/lib/auth/session";
import { getAdminLocale } from "@/lib/i18n/admin-server";

import { AdminSidebar } from "./_components/sidebar";
import { AdminTopBar } from "./_components/topbar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [staff, locale] = await Promise.all([requireAdminSession(), getAdminLocale()]);
  return (
    <div className="flex min-h-screen">
      {/* Skip link: スクリーンリーダ / キーボードユーザがメインコンテンツへ即移動できる */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        メインコンテンツへスキップ
      </a>
      <AdminSidebar role={staff.role} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar email={staff.email} name={staff.name} locale={locale} />
        <main id="admin-main" className="flex-1 overflow-x-hidden bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
