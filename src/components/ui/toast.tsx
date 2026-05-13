"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";
type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (input: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * 軽量な Toast プロバイダ。@radix-ui/react-toast 等の依存を増やさず、
 * 4 秒で自動消滅 + 手動で閉じられる最低限の機能だけ。
 *
 * 使い方:
 *   const { toast } = useToast();
 *   toast({ title: "保存しました", variant: "success" });
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { ...input, id }]);
      // 自動消滅 (4 秒)
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // SSR や ToastProvider 未配置の場合は no-op に劣化
    return {
      toast: (input) => console.warn("[toast:no-provider]", input),
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  // ESC で最新を閉じる
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && items.length > 0) onDismiss(items[items.length - 1].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, onDismiss]);

  return (
    <div
      role="region"
      aria-label="通知"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto w-full max-w-sm rounded-md border bg-background p-3 text-sm shadow-md",
            "data-[variant=success]:border-emerald-300 data-[variant=success]:bg-emerald-50 data-[variant=success]:text-emerald-900",
            "data-[variant=warning]:border-amber-300 data-[variant=warning]:bg-amber-50 data-[variant=warning]:text-amber-900",
            "data-[variant=destructive]:border-destructive/40 data-[variant=destructive]:bg-destructive/10 data-[variant=destructive]:text-destructive",
          )}
          data-variant={t.variant ?? "default"}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-semibold">{t.title}</p>
              {t.description && <p className="text-xs opacity-80">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => onDismiss(t.id)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
