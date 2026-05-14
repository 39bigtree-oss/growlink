"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  decideAiReviewAction,
  type AiReviewDecisionState,
} from "../actions";

const initial: AiReviewDecisionState = { ok: false };

export function ReviewDecisionForm({
  reviewId,
  aiOutput,
}: {
  reviewId: string;
  aiOutput: string;
}) {
  const bound = decideAiReviewAction.bind(null, reviewId);
  const [state, dispatch, pending] = useActionState(bound, initial);
  const [decision, setDecision] = useState<"APPROVED" | "EDITED" | "REJECTED">(
    "APPROVED",
  );

  return (
    <form action={dispatch} className="space-y-4">
      <fieldset className="space-y-2">
        <Label className="block">決定</Label>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { v: "APPROVED" as const, label: "そのまま承認", className: "border-emerald-500" },
            { v: "EDITED" as const, label: "編集して承認", className: "border-emerald-500" },
            { v: "REJECTED" as const, label: "却下", className: "border-destructive" },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 ${decision === o.v ? `${o.className} bg-muted/40` : ""}`}
            >
              <input
                type="radio"
                name="decision"
                value={o.v}
                checked={decision === o.v}
                onChange={() => setDecision(o.v)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {decision === "EDITED" ? (
        <div className="space-y-1">
          <Label htmlFor="finalOutput">編集後の公開版</Label>
          <Textarea
            id="finalOutput"
            name="finalOutput"
            rows={10}
            defaultValue={aiOutput}
            className="font-mono text-xs"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="note">レビューノート (任意)</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          placeholder="例: 「外国人」表現を「海外籍の方」に修正。差別表現の懸念は無いが、表現を柔らかく。"
        />
      </div>

      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-destructive"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} variant={decision === "REJECTED" ? "destructive" : "default"}>
          {pending ? "送信中..." : `${decision} として確定`}
        </Button>
      </div>
    </form>
  );
}
