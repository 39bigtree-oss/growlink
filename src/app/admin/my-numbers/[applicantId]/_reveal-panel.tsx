"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

import { revealMyNumberAction } from "../actions";

export function RevealMyNumberPanel({
  applicantId,
  role,
}: {
  applicantId: string;
  role: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<{ masked?: string; plain?: string } | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await revealMyNumberAction(applicantId, fd);
          toast({
            title: res.ok ? "閲覧記録を作成しました" : "閲覧失敗",
            description: res.message,
            variant: res.ok ? "success" : "destructive",
          });
          if (res.ok) {
            setShown({ masked: res.masked, plain: res.plain });
          }
        })
      }
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="reason">閲覧理由 (必須 / 5 文字以上)</Label>
        <Textarea
          id="reason"
          name="reason"
          required
          minLength={5}
          rows={2}
          placeholder="例: 源泉徴収票発行のため、令和 7 年分の控除データ作成のため"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "申請中..." : "閲覧申請して表示"}
      </Button>

      {shown ? (
        <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="text-xs text-muted-foreground">マイナンバー</div>
          <div className="font-mono text-base">
            {role === "ADMIN" && shown.plain ? shown.plain : shown.masked}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            この閲覧はアクセスログに記録され、AuditEvent チェーンにも書き込まれました。
          </p>
        </div>
      ) : null}
    </form>
  );
}
