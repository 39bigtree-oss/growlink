"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SupportedLocale } from "@/lib/i18n/config";

import jaMessages from "@/../messages/ja.json";
import enMessages from "@/../messages/en.json";
import viMessages from "@/../messages/vi.json";
import idMessages from "@/../messages/id.json";
import zhMessages from "@/../messages/zh.json";

const MESSAGES: Record<SupportedLocale, typeof jaMessages> = {
  ja: jaMessages,
  en: enMessages,
  vi: viMessages as unknown as typeof jaMessages,
  id: idMessages as unknown as typeof jaMessages,
  zh: zhMessages as unknown as typeof jaMessages,
};
const MAX_TURNS = 5;

type Turn = { turnIndex: number; role: "ai" | "applicant"; text: string };

type T = (path: string, vars?: Record<string, string | number>) => string;

function buildT(messages: typeof jaMessages): T {
  return (path, vars) => {
    const parts = path.split(".");
    let cur: unknown = messages;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return path;
      }
    }
    if (typeof cur !== "string") return path;
    if (!vars) return cur;
    return cur.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
  };
}

export function InterviewClient({
  token,
  applicantName,
  locale,
  initialTurns,
  started,
}: {
  token: string;
  applicantName: string;
  locale: SupportedLocale;
  initialTurns: Turn[];
  started: boolean;
}) {
  const t = buildT(MESSAGES[locale] ?? MESSAGES.ja);
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [isStarted, setIsStarted] = useState(started);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [endOpen, setEndOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiCount = turns.filter((t) => t.role === "ai").length;
  const lastTurn = turns[turns.length - 1];
  const awaitingAnswer = lastTurn?.role === "ai";
  const reachedMax = aiCount >= MAX_TURNS;

  async function post(action: "start" | "ask" | "answer", text?: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${encodeURIComponent(token)}/turn`, {
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
    const r = await post("start");
    if (!r) return;
    setIsStarted(true);
    const ask = await post("ask");
    if (!ask) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "ai", text: ask.question ?? "" }]);
  }

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    const ans = await post("answer", text);
    if (!ans) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "applicant", text }]);
    setDraft("");
    if (aiCount >= MAX_TURNS) return;
    const ask = await post("ask");
    if (!ask) return;
    setTurns((prev) => [...prev, { turnIndex: prev.length, role: "ai", text: ask.question ?? "" }]);
    if (ask.shouldClose) {
      setEndOpen(true);
    }
  }

  async function end() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${encodeURIComponent(token)}/end`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setEndOpen(false);
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-emerald-900">
        <h1 className="mb-2 text-xl font-semibold">{t("interview.thanks")}</h1>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("interview.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground">{applicantName} 様</p>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("interview.intro")}</p>
      </header>

      <div className="text-xs text-muted-foreground">
        {t("interview.progress")}: {t("interview.turnLabel", { n: Math.min(aiCount + 1, MAX_TURNS), total: MAX_TURNS })}
      </div>

      <div className="space-y-2">
        {turns.map((tn, i) => (
          <Card key={i} className={tn.role === "ai" ? "bg-muted/30" : ""}>
            <CardContent className="py-3 text-sm">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {tn.role === "ai" ? t("interview.ai") : t("interview.you")}
              </div>
              <p className="whitespace-pre-wrap">{tn.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {!isStarted ? (
        <Button onClick={start} disabled={pending}>
          {pending ? t("common.loading") : t("interview.start")}
        </Button>
      ) : awaitingAnswer && !reachedMax ? (
        <div className="space-y-2">
          <Textarea
            placeholder={t("interview.yourAnswer")}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setEndOpen(true)} disabled={pending}>
              {t("interview.end")}
            </Button>
            <Button onClick={submit} disabled={pending || draft.trim() === ""}>
              {pending ? t("common.loading") : t("interview.answer")}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setEndOpen(true)} disabled={pending}>
          {t("interview.end")}
        </Button>
      )}

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("interview.end")}</DialogTitle>
            <DialogDescription>{t("interview.endConfirm")}</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndOpen(false)} disabled={pending}>
              {t("common.back")}
            </Button>
            <Button onClick={end} disabled={pending}>
              {pending ? t("common.loading") : t("interview.end")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
