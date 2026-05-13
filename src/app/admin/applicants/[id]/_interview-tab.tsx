"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type InterviewTabData = {
  interview: {
    id: string;
    status: string;
    channel: string | null;
    provider: string | null;
    language: string;
    startedAt: Date | null;
    endedAt: Date | null;
    durationSec: number | null;
    transcript: string | null;
    summary: unknown;
    turns: Array<{ turnIndex: number; role: string; text: string; createdAt: Date }>;
    activeToken: { token: string; expiresAt: Date } | null;
  } | null;
};

export function InterviewTab({
  applicantId,
  data,
  canWrite,
}: {
  applicantId: string;
  data: InterviewTabData;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function scheduleInterview(channel: "voice" | "text", sendInvite: boolean) {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantId, channel, sendInvite }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        simulateUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setInfo(`求職者リンク: ${body.url ?? "-"}`);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!data.interview) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">AI 電話面接</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setOpen(true)}>
              面接を予約
            </Button>
          )}
        </CardHeader>
        <CardContent className="text-sm">
          <CardDescription>まだ面接は予約されていません。</CardDescription>
          {info && <p className="mt-2 break-all text-xs text-emerald-700">{info}</p>}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>面接を予約</DialogTitle>
                <DialogDescription>
                  Interview レコードと専用トークンを発行し、ご本人へ招待メールを送信します。EMAIL_PROVIDER=mock なら実送信されません。
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
                <Button
                  onClick={() => scheduleInterview("text", true)}
                  disabled={pending}
                >
                  {pending ? "送信中..." : "予約してメール送信"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const i = data.interview;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">AI 電話面接</CardTitle>
            <CardDescription className="mt-1 space-x-2">
              <Badge variant={i.status === "completed" ? "success" : i.status === "in_progress" ? "warning" : "muted"}>
                {i.status}
              </Badge>
              <span className="text-xs">channel: {i.channel ?? "—"} / provider: {i.provider ?? "—"} / lang: {i.language}</span>
            </CardDescription>
          </div>
          <div className="space-x-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/interviews/${i.id}/simulate`}>シミュレータ</a>
            </Button>
            {i.activeToken && (
              <Button asChild size="sm" variant="outline">
                <a
                  href={`/interview/${encodeURIComponent(i.activeToken.token)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  求職者リンクを開く
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            開始: {i.startedAt ? i.startedAt.toISOString() : "—"} /{" "}
            終了: {i.endedAt ? i.endedAt.toISOString() : "—"} /{" "}
            所要: {i.durationSec ? `${i.durationSec}s` : "—"}
          </p>

          {i.turns.length === 0 ? (
            <CardDescription>まだ会話ターンはありません。</CardDescription>
          ) : (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                文字起こし ({i.turns.length} ターン)
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                {i.turns.map((t) => (
                  <div
                    key={t.turnIndex}
                    className={t.role === "ai" ? "rounded bg-muted/40 p-2" : "rounded border p-2"}
                  >
                    <strong className="text-[10px] uppercase text-muted-foreground">{t.role}</strong>
                    <p className="whitespace-pre-wrap">{t.text}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {typeof i.summary === "object" && i.summary !== null && (
            <SummaryView summary={i.summary as Record<string, unknown>} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryView({ summary }: { summary: Record<string, unknown> }) {
  return (
    <section className="rounded-md border bg-muted/30 p-3 text-xs">
      <h3 className="mb-2 text-sm font-semibold">AI 面接サマリ</h3>
      <p>総合スコア: {String((summary.overallScore as number | undefined) ?? "—")}</p>
      <p className="mt-1">{String((summary.headline as string | undefined) ?? "")}</p>
      {Array.isArray(summary.strengths) && (
        <p className="mt-2">強み: {(summary.strengths as string[]).join(" / ")}</p>
      )}
      {Array.isArray(summary.concerns) && (summary.concerns as string[]).length > 0 && (
        <p className="mt-1">懸念点: {(summary.concerns as string[]).join(" / ")}</p>
      )}
      <p className="mt-2">推奨アクション: {String((summary.recommendedNextAction as string | undefined) ?? "")}</p>
    </section>
  );
}
