import { cn } from "@/lib/utils";

/**
 * Tsumugi ロゴ。
 *
 * - "紡" の上に絡む 2 本の糸をストロークで表現する SVG。
 * - サイズは tailwind ユーティリティ (size-*) を className で渡せる。
 * - 文字色は currentColor、糸の色は accent。
 */
export function TsumugiLogo({
  className,
  withWordmark = false,
  wordmarkClassName,
}: {
  className?: string;
  withWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="h-7 w-7"
      >
        <defs>
          <linearGradient id="tsumugiThread" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--warning))" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="10" fill="hsl(var(--primary))" />
        <path
          d="M9 28 C 14 14, 26 14, 31 28"
          stroke="hsl(var(--warning))"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M9 28 C 14 36, 26 36, 31 28"
          stroke="hsl(var(--secondary))"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="20" cy="20" r="2.4" fill="hsl(var(--primary-foreground))" />
      </svg>
      {withWordmark && (
        <span
          className={cn(
            "select-none text-base font-semibold tracking-[0.18em] text-foreground",
            wordmarkClassName,
          )}
        >
          TSUMUGI
        </span>
      )}
    </span>
  );
}
