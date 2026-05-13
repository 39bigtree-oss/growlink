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

export function SendFaxButton({
  faxSheetId,
  facilityName,
  alreadySent,
  canSend,
}: {
  faxSheetId: string;
  facilityName: string;
  alreadySent: boolean;
  canSend: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadySent) {
    return <span className="text-xs text-muted-foreground">送信済み</span>;
  }
  if (!canSend) {
    return <span className="text-xs text-muted-foreground">送信権限なし</span>;
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/fax-sheets/${faxSheetId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "FAX" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        送信
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FAX を送信しますか？</DialogTitle>
            <DialogDescription>
              {facilityName} 宛に送信票を送信します。Phase 1-7 はモック動作で、実際の FAX は送信されません (送信ログのみ記録)。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button onClick={send} disabled={pending}>
              {pending ? "送信中..." : "送信する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
