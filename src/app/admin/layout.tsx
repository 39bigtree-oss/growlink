import type { ReactNode } from "react";

import { requireAdminSession } from "@/lib/auth/session";

import { AdminSidebar } from "./_components/sidebar";
import { AdminTopBar } from "./_components/topbar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await requireAdminSession();
  return (
    <div className="flex min-h-screen">
      <AdminSidebar role={staff.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar email={staff.email} name={staff.name} />
        <main className="flex-1 overflow-x-hidden bg-background">{children}</main>
      </div>
    </div>
  );
}
