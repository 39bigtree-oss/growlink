"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { verifyAuditChainAction, type VerifyResult } from "./actions";

export function VerifyChainPanel() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);

  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await verifyAuditChainAction();
            setResult(r);
            toast({
              title: r.ok ? "整合性 OK" : "改ざん検知",
              description: r.message,
              variant: r.ok ? "success" : "destructive",
            });
          })
        }
      >
        {pending ? "検証中..." : "全件チェーン整合性を再計算"}
      </Button>
      {result ? (
        <div
          className={
            result.ok
              ? "rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
              : "rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          <div className="font-semibold">{result.message}</div>
          <div className="text-xs">対象件数: {result.total}</div>
          {result.brokenAt !== undefined ? (
            <div className="text-xs">破綻位置: index {result.brokenAt}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
