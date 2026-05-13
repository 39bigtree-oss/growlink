import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "ALL", label: "全件" },
  { value: "RECEIVED", label: "受付" },
  { value: "DIAGNOSED", label: "診断完了" },
  { value: "INTERVIEW_DONE", label: "面接完了" },
  { value: "SALES_READY", label: "営業準備" },
  { value: "IN_INTRODUCTION", label: "紹介中" },
  { value: "CONTRACTED", label: "成約" },
  { value: "REJECTED", label: "辞退" },
] as const;

export type StatusTabValue = (typeof STATUS_TABS)[number]["value"];

export function ApplicantsStatusTabs({
  current,
  searchParams,
  counts,
}: {
  current: StatusTabValue;
  searchParams: Record<string, string | string[] | undefined>;
  counts: Partial<Record<StatusTabValue, number>>;
}) {
  function hrefFor(value: StatusTabValue): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "status" || k === "page") continue;
      if (typeof v === "string") sp.set(k, v);
    }
    if (value !== "ALL") sp.set("status", value);
    return `/admin/applicants${sp.toString() ? `?${sp.toString()}` : ""}`;
  }

  return (
    <div className="-mx-1 flex flex-wrap items-center gap-1 overflow-x-auto">
      {STATUS_TABS.map((tab) => {
        const active = current === tab.value;
        const count = counts[tab.value];
        return (
          <Link
            key={tab.value}
            href={hrefFor(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            {typeof count === "number" && (
              <Badge variant={active ? "outline" : "muted"} className="px-1.5 py-0">
                {count}
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
