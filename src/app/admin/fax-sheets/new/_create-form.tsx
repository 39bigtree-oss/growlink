"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FacilityRow = {
  id: string;
  name: string;
  categoryLabel: string;
  prefecture: string;
  city: string;
  fax: string | null;
  isFaxPublic: boolean;
};

export function CreateFaxSheetsForm({
  applicantId,
  applicantLabel,
  facilities,
}: {
  applicantId: string;
  applicantLabel: string;
  facilities: FacilityRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ created: number; errors: number } | null>(null);

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  async function submit() {
    if (selectedIds.length === 0) {
      setError("送付先施設を 1 つ以上選んでください");
      return;
    }
    setPending(true);
    setError(null);
    setProgress(null);
    try {
      const res = await fetch("/api/fax-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId, facilityIds: selectedIds }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok: boolean;
        created?: unknown[];
        errors?: unknown[];
        error?: string;
      };
      if (!res.ok && !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setProgress({
        created: body.created?.length ?? 0,
        errors: body.errors?.length ?? 0,
      });
      router.refresh();
      setTimeout(() => router.push("/admin/fax-sheets"), 800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {};
    if (value) for (const f of facilities) next[f.id] = true;
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">送付対象施設 ({facilities.length} 件)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-xs">
            <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(true)}>
              全選択
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(false)}>
              全解除
            </Button>
            <span className="text-muted-foreground">{selectedIds.length} 件選択中</span>
          </div>
          <div className="max-h-[480px] divide-y overflow-y-auto rounded-md border">
            {facilities.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                条件に合致する施設がありません。フィルタを調整してください。
              </p>
            ) : (
              facilities.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
                  <Checkbox
                    checked={!!selected[f.id]}
                    onCheckedChange={(v) =>
                      setSelected((prev) => ({ ...prev, [f.id]: v === true }))
                    }
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.categoryLabel} / {f.prefecture}
                      {f.city} / FAX {f.fax ?? "未登録"}
                      {!f.isFaxPublic && " (非公開)"}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {progress && (
        <p role="status" className="text-sm text-emerald-700">
          生成完了: 成功 {progress.created} / 失敗 {progress.errors}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">求職者: {applicantLabel}</p>
        <Button onClick={submit} disabled={pending || selectedIds.length === 0}>
          {pending ? "生成中..." : `選択した ${selectedIds.length} 件に一括生成`}
        </Button>
      </div>
    </div>
  );
}
