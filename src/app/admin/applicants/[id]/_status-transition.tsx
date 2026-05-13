"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusLabel } from "@/lib/applicants/status-machine";
import type { ApplicantStatus } from "@prisma/client";

export function StatusTransitionButtons({
  applicantId,
  current,
  options,
  disabled,
}: {
  applicantId: string;
  current: ApplicantStatus;
  options: ApplicantStatus[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState<ApplicantStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        現在 ({statusLabel(current)}) は終端状態のため次のステータスはありません。
      </p>
    );
  }

  async function execute() {
    if (!target) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/applicants/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <Button
          key={opt}
          variant={opt === "REJECTED" ? "outline" : "default"}
          size="sm"
          disabled={disabled || pending}
          onClick={() => setTarget(opt)}
        >
          → {statusLabel(opt)}
        </Button>
      ))}
      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ステータスを変更しますか？</DialogTitle>
            <DialogDescription>
              {statusLabel(current)} → {target ? statusLabel(target) : ""} に遷移します。
              この操作は監査ログに記録されます。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              キャンセル
            </Button>
            <Button onClick={execute} disabled={pending}>
              {pending ? "更新中..." : "変更する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
