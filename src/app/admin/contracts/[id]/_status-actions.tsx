"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { updateContractStatusAction } from "../actions";

const NEXT: Record<string, Array<{ status: string; label: string; variant?: "default" | "outline" | "destructive" }>> = {
  DRAFT: [
    { status: "SENT", label: "送付済にする" },
    { status: "CANCELLED", label: "解約", variant: "destructive" },
  ],
  SENT: [
    { status: "SIGNED", label: "締結済にする" },
    { status: "EXPIRED", label: "期限切れ" },
    { status: "CANCELLED", label: "解約", variant: "destructive" },
  ],
  SIGNED: [
    { status: "EXPIRED", label: "期限切れ" },
    { status: "CANCELLED", label: "解約", variant: "destructive" },
  ],
};

export function ContractStatusActions({ id, status }: { id: string; status: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const buttons = NEXT[status] ?? [];

  if (buttons.length === 0) {
    return <p className="text-sm text-muted-foreground">この状態からの遷移はありません。</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <Button
          key={b.status}
          variant={b.variant ?? "default"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateContractStatusAction(id, b.status);
              toast({
                title: res.ok ? "更新しました" : "更新失敗",
                description: res.message,
                variant: res.ok ? "success" : "destructive",
              });
            })
          }
        >
          {b.label}
        </Button>
      ))}
    </div>
  );
}
