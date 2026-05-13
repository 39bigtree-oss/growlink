import Link from "next/link";

import { BRAND } from "@/lib/brand";

import { TsumugiLogo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TsumugiLogo withWordmark wordmarkClassName="text-xs" />
          <span className="hidden text-xs sm:inline">{BRAND.taglineJa}</span>
        </div>
        <nav aria-label="フッターリンク" className="flex flex-wrap items-center gap-4 text-xs">
          <Link href="/login" className="hover:text-foreground">
            管理画面ログイン
          </Link>
          <a
            href="https://github.com/39bigtree-oss/growlink"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <span className="select-none text-muted-foreground/70">
            © {new Date().getFullYear()} {BRAND.company.nameJa}
          </span>
        </nav>
      </div>
    </footer>
  );
}
