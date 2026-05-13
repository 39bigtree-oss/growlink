"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Result = {
  rowNumber: number;
  ok: boolean;
  action?: "created" | "updated";
  facilityId?: string;
  error?: string;
};

type Summary = {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  results: Result[];
};

export function CsvImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setPending(true);
    setSummary(null);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/facilities/import", {
        method: "POST",
        body: fd,
      });
      const body = (await res.json().catch(() => ({}))) as Summary & { ok?: boolean; error?: string };
      if (!res.ok || body.ok === false) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setSummary({
        totalRows: body.totalRows,
        created: body.created,
        updated: body.updated,
        failed: body.failed,
        results: body.results,
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">CSV ファイル</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="file"
          accept="text/csv,.csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button onClick={submit} disabled={pending || !file}>
          {pending ? "アップロード中..." : "インポート実行"}
        </Button>
        {summary && (
          <div className="rounded border bg-muted/30 p-3 text-xs">
            <p>合計 {summary.totalRows} 行 / 新規 {summary.created} / 更新 {summary.updated} / 失敗 {summary.failed}</p>
            {summary.failed > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-destructive">失敗行を表示</summary>
                <ul className="mt-1 space-y-1">
                  {summary.results.filter((r) => !r.ok).map((r) => (
                    <li key={r.rowNumber}>行 {r.rowNumber}: {r.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
