import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  function hrefFor(p: number): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page") continue;
      if (typeof v === "string") sp.set(k, v);
    }
    sp.set("page", String(p));
    return `/admin/applicants?${sp.toString()}`;
  }
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return (
    <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
      <span>
        {page} / {totalPages} ページ
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" disabled={page === 1}>
          <Link href={hrefFor(prev)} aria-disabled={page === 1}>
            前へ
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
          <Link href={hrefFor(next)} aria-disabled={page >= totalPages}>
            次へ
          </Link>
        </Button>
      </div>
    </div>
  );
}
