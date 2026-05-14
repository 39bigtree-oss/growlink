"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  FileSignature,
  IdCard,
  Info,
  LayoutDashboard,
  Menu,
  Receipt,
  Scale,
  Send,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TsumugiLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
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
  { href: "/admin/system-status", label: "機能状態", icon: Info },
  { href: "/admin/settings", label: "設定", icon: Settings, cap: "settings:read" },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter((n) => (n.cap ? hasCapability(role, n.cap) : true));

  // 画面遷移したらドロワーを閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* モバイル: フッター固定の開閉ボタン */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label="メニューを開く"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* モバイル: ドロワー */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-64 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <NavInner role={role} items={items} pathname={pathname} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* デスクトップ: 常時表示 */}
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
        <NavInner role={role} items={items} pathname={pathname} />
      </aside>
    </>
  );
}

function NavInner({
  role,
  items,
  pathname,
  onClose,
}: {
  role: string;
  items: NavItem[];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-5">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
          <TsumugiLogo withWordmark wordmarkClassName="text-sm" />
        </Link>
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="閉じる">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <p className="-mt-3 px-4 pb-2 text-xs text-muted-foreground">管理画面</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    </div>
  );
}
