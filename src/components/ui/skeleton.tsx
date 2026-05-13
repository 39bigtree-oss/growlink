import { cn } from "@/lib/utils";

/**
 * 軽量スケルトン。表のロード待ち / カードのロード待ちで使う。
 * tailwindcss-animate の animate-pulse を利用。
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2 p-3">
      <span className="sr-only">読み込み中...</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 flex-1", c === 0 ? "max-w-[28%]" : "")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
