"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function RunDiagnosisButton({
  applicantId,
  alreadyDiagnosed,
}: {
  applicantId: string;
  alreadyDiagnosed: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    if (alreadyDiagnosed) {
      const ok = window.confirm("既に診断結果があります。再生成してよろしいですか？");
      if (!ok) return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId, regenerate: alreadyDiagnosed }),
      });
      const json = (await res.json()) as { ok: boolean; pdfUrl?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.pdfUrl) {
        window.open(json.pdfUrl, "_blank", "noopener");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={run} disabled={pending}>
        {pending ? "実行中..." : alreadyDiagnosed ? "再診断を実行" : "AI 診断を実行"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          失敗: {error}
        </p>
      ) : null}
    </div>
  );
}
