"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApplicantsFilterBar({ initial }: { initial: { q?: string; from?: string; to?: string } }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initial.q ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  function pushWith(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v.length > 0) sp.set(k, v);
      else sp.delete(k);
    }
    // フィルタを変えたらページを 1 に戻す
    sp.delete("page");
    router.push(`/admin/applicants?${sp.toString()}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    pushWith({ q, from, to });
  }

  function reset() {
    setQ("");
    setFrom("");
    setTo("");
    const sp = new URLSearchParams(params.toString());
    sp.delete("q");
    sp.delete("from");
    sp.delete("to");
    sp.delete("page");
    router.push(`/admin/applicants?${sp.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
      <div className="space-y-1">
        <Label htmlFor="q" className="text-xs text-muted-foreground">
          氏名・フリガナ・メール
        </Label>
        <Input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例: 山田 / ヤマダ / @example"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground">
          申込日 (開始)
        </Label>
        <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">
          申込日 (終了)
        </Label>
        <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          検索
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          リセット
        </Button>
      </div>
    </form>
  );
}
