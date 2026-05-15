"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface NewBadgeProps {
  feature: string;
  children: React.ReactNode;
  className?: string;
}

function storageKey(feature: string) {
  return `whats-new:${feature}:seen`;
}

export function NewBadge({ feature, children, className }: NewBadgeProps) {
  const [seen, setSeen] = React.useState(true);

  React.useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(storageKey(feature)) === "true");
    } catch {
      setSeen(true);
    }
  }, [feature]);

  const markSeen = React.useCallback(() => {
    try {
      window.localStorage.setItem(storageKey(feature), "true");
    } catch {
      /* ignore */
    }
    setSeen(true);
  }, [feature]);

  React.useEffect(() => {
    if (seen) return;
    const id = window.setTimeout(markSeen, 4000);
    return () => window.clearTimeout(id);
  }, [seen, markSeen]);

  if (seen) {
    return <>{children}</>;
  }

  return (
    <span
      className={cn(
        "relative inline-flex animate-pulse rounded-md ring-2 ring-warning ring-offset-2",
        className,
      )}
      onClickCapture={markSeen}
    >
      {children}
      <button
        type="button"
        aria-label="新機能を確認"
        onClick={(e) => {
          e.stopPropagation();
          markSeen();
        }}
        className="absolute -right-2 -top-2 z-10 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
      >
        NEW
      </button>
    </span>
  );
}
