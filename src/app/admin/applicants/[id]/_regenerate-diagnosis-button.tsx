"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { regenerateDiagnosisAction } from "./actions";

/**
 * AI 適職診断 (v2) を最新条件で再計算するボタン。
 * 実体はキャッシュ破棄 + updatedAt 進めるだけで、次の PDF アクセス時に再生成される。
 */
export function RegenerateDiagnosisButton({ applicantId }: { applicantId: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    start(async () => {
      const res = await regenerateDiagnosisAction(applicantId);
      setMessage(res.ok ? "再計算しました。PDF を再読み込みしてください。" : (res.message ?? "失敗しました"));
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onClick} disabled={pending} className="gap-1">
        <RefreshCw className={`h-3 w-3 ${pending ? "animate-spin" : ""}`} />
        AI 診断やり直し
      </Button>
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}
