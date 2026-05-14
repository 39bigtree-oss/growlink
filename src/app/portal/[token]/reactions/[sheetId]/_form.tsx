"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { submitPortalReactionAction, type PortalReactionState } from "./actions";

const initial: PortalReactionState = { ok: false };

export function PortalReactionForm({ token, sheetId }: { token: string; sheetId: string }) {
  const bound = submitPortalReactionAction.bind(null, token, sheetId);
  const [state, formAction, pending] = useActionState(bound, initial);

  if (state.ok) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <Label className="mb-2 block">この方への興味度</Label>
        <RadioGroup name="interested" defaultValue="yes" className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> 興味あり — 面談・情報追加を希望
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> 今回は見送り
          </label>
        </RadioGroup>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="comment">コメント (任意)</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={3}
          placeholder="例: 夜勤可否を確認したい、面談希望日 8/10 以降"
        />
      </div>
      {state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "送信中..." : "反応を送る"}
        </Button>
      </div>
    </form>
  );
}
