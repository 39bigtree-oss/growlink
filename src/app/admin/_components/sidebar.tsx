"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  FileSignature,
  IdCard,
  LayoutDashboard,
  Receipt,
  Scale,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TsumugiLogo } from "@/components/brand/logo";
import { hasCapability, type AdminCapability } from "@/lib/auth/rbac";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  cap?: AdminCapability;
};

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/applicants", label: "申込一覧", icon: Users, cap: "applicants:read" },
  { href: "/admin/sales", label: "営業フロー", icon: Briefcase, cap: "applicants:read" },
  { href: "/admin/fax-sheets", label: "FAX 送信票", icon: Send, cap: "fax:read" },
  { href: "/admin/facilities", label: "施設マスタ", icon: Building2, cap: "facilities:read" },
  // v1.5: Phase 6 内部システム
  { href: "/admin/job-orders", label: "求人案件", icon: BadgeCheck, cap: "job-orders:read" },
  { href: "/admin/contracts", label: "取引契約", icon: FileSignature, cap: "contracts:read" },
  { href: "/admin/placements", label: "紹介成立", icon: Scale, cap: "placements:read" },
  { href: "/admin/invoices", label: "請求書", icon: Receipt, cap: "invoices:read" },
  { href: "/admin/my-numbers", label: "マイナンバー", icon: IdCard, cap: "my-number:read" },
  { href: "/admin/audit", label: "監査ログ", icon: ShieldCheck, cap: "audit:read" },
  { href: "/admin/settings", label: "設定", icon: Settings, cap: "settings:read" },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => (n.cap ? hasCapability(role, n.cap) : true));
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="px-4 py-5">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
          <TsumugiLogo withWordmark wordmarkClassName="text-sm" />
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">管理画面</p>
      </div>
      <nav className="flex-1 space-y-1 px-2 pb-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        ロール: <span className="font-semibold text-foreground">{role}</span>
      </div>
    </aside>
  );
}
