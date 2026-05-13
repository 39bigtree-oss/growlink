"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const MAX_TURNS = 5;

type Turn = { turnIndex: number; role: "ai" | "applicant"; text: string };

export function SimulateClient({
  interviewId,
  applicantId,
  started,
  completed,
  initialTurns,
  canWrite,
}: {
  interviewId: string;
  applicantId: string;
  started: boolean;
  completed: boolean;
  initialTurns: Turn[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [isStarted, setIsStarted] = useState(started);
  const [isCompleted, setIsCompleted] = useState(completed);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);

  async function post(action: "start" | "ask" | "answer", text?: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/interviews/${interviewId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        question?: string;
        intent?: string;
        shouldClose?: boolean;
        turn?: Turn;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return null;
      }
      return body;
    } finally {
      setPending(false);
    }
  }

  async function start() {
    if (!isStarted) {
      const r = await post("start");
      if (!r) return;
      setIsStarted(true);
    }
    const ask = await post("ask");
    if (!ask) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "ai", text: ask.question ?? "" }]);
    setIntent(ask.intent ?? null);
  }

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    const ans = await post("answer", text);
    if (!ans) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "applicant", text }]);
    setDraft("");
    const aiCount = turns.filter((t) => t.role === "ai").length + 1;
    if (aiCount >= MAX_TURNS) return;
    const ask = await post("ask");
    if (!ask) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "ai", text: ask.question ?? "" }]);
    setIntent(ask.intent ?? null);
  }

  async function end() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/interviews/${interviewId}/end`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setIsCompleted(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canWrite) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          編集権限がありません。ADMIN / CONSULTANT のみ操作できます。閲覧用にターン履歴のみ表示します。
          <ul className="mt-3 space-y-2">
            {turns.map((t, i) => (
              <li key={i} className={t.role === "ai" ? "rounded bg-muted/40 p-2" : "rounded border p-2"}>
                <strong className="text-xs uppercase">{t.role}:</strong>
                <p className="whitespace-pre-wrap">{t.text}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-emerald-700">
          面接は完了しています。サマリと差分マージは Applicant 詳細の面接タブで確認できます。
          <Button variant="outline" size="sm" className="ml-3" onClick={() => router.push(`/admin/applicants/${applicantId}`)}>
            申込詳細へ
          </Button>
        </CardContent>
      </Card>
    );
  }

  const aiCount = turns.filter((t) => t.role === "ai").length;
  const awaitingAnswer = turns[turns.length - 1]?.role === "ai";
  const reachedMax = aiCount >= MAX_TURNS;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 py-3 text-sm">
          <p className="text-xs text-muted-foreground">
            進行状況: {Math.min(aiCount + 1, MAX_TURNS)} / {MAX_TURNS} 質問
            {intent && <span className="ml-2">意図: {intent}</span>}
          </p>
          {turns.length === 0 ? (
            <p className="text-muted-foreground">「最初の質問を生成」を押してください。</p>
          ) : (
            turns.map((t, i) => (
              <div
                key={i}
                className={t.role === "ai" ? "rounded bg-muted/40 p-2" : "rounded border p-2"}
              >
                <strong className="text-xs uppercase">{t.role}:</strong>
                <p className="whitespace-pre-wrap">{t.text}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isStarted || turns.length === 0 ? (
          <Button onClick={start} disabled={pending}>
            {pending ? "..." : "面接を開始 / 最初の質問"}
          </Button>
        ) : awaitingAnswer && !reachedMax ? (
          <>
            <Textarea
              placeholder="求職者の回答 (テキストでシミュレート)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full"
            />
            <Button onClick={submit} disabled={pending || draft.trim() === ""}>
              {pending ? "..." : "回答を送信 → 次の質問"}
            </Button>
          </>
        ) : (
          <Button onClick={start} disabled={pending}>
            次の質問を生成
          </Button>
        )}
        <Button variant="outline" onClick={end} disabled={pending}>
          面接を終了
        </Button>
      </div>
    </div>
  );
}
