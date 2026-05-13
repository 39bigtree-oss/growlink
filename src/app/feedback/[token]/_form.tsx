"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Initial = { interested: boolean; comment: string | null; receivedAt: Date | null } | null;

export function FeedbackForm({
  token,
  initial,
}: {
  token: string;
  initial: Initial;
}) {
  const [interested, setInterested] = useState<string>(
    initial ? (initial.interested ? "yes" : "no") : "yes",
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interested: interested === "yes", comment }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="py-6 text-emerald-700">
          ご回答ありがとうございます。担当者よりご連絡を差し上げる場合がございます。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ご検討状況をお知らせください</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={interested} onValueChange={setInterested}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="interested-yes" />
            <Label htmlFor="interested-yes">興味あり / 詳細を希望します</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="interested-no" />
            <Label htmlFor="interested-no">今回は見送ります</Label>
          </div>
        </RadioGroup>

        <div className="space-y-1">
          <Label htmlFor="comment">コメント (任意)</Label>
          <Textarea
            id="comment"
            placeholder="ご質問や希望条件があればこちらにご記入ください"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
        <Button onClick={submit} disabled={pending}>
          {pending ? "送信中..." : "送信する"}
        </Button>
      </CardContent>
    </Card>
  );
}
