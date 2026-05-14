"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import {
  captureCheckpointAction,
  verifyAuditChainAction,
  type CheckpointResult,
  type VerifyResult,
} from "./actions";

export function VerifyChainPanel() {
  const { toast } = useToast();
  const [verifyPending, startVerify] = useTransition();
  const [cpPending, startCp] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [cpResult, setCpResult] = useState<CheckpointResult | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={verifyPending}
          onClick={() =>
            startVerify(async () => {
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
          {verifyPending ? "検証中..." : "全件チェーン整合性を再計算"}
        </Button>
        <Button
          variant="outline"
          disabled={cpPending}
          onClick={() =>
            startCp(async () => {
              const r = await captureCheckpointAction();
              setCpResult(r);
              toast({
                title: r.ok ? "チェックポイント保存" : "チェックポイント失敗",
                description: r.message,
                variant: r.ok ? "success" : "destructive",
              });
            })
          }
        >
          {cpPending ? "保存中..." : "チェックポイントを保存"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        全件再計算は監査要件時に使用。日次運用ではチェックポイント方式で差分検証 →
        ジョブ化推奨 (v1.9 で BullMQ scheduled job 化)。
      </p>
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
      {cpResult ? (
        <div
          className={
            cpResult.ok
              ? "rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900"
              : "rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          <div className="font-semibold">{cpResult.message}</div>
          <div className="text-xs">スキャン件数: {cpResult.scanned}</div>
        </div>
      ) : null}
    </div>
  );
}
