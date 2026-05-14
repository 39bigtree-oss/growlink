"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createRefundPolicyAction, type RefundPolicyActionState } from "../actions";

const initialState: RefundPolicyActionState = { ok: false };

export function NewRefundPolicyForm() {
  const [state, formAction, pending] = useActionState(createRefundPolicyAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">規定名</Label>
        <Input id="name" name="name" required placeholder="例: 標準 90 日段階返金" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">説明 (任意)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tiers">段階 (カンマ区切り / 形式: 日数:返金%)</Label>
        <Textarea
          id="tiers"
          name="tiers"
          rows={3}
          required
          placeholder="例: 30:100, 60:50, 90:20"
        />
        <p className="text-xs text-muted-foreground">
          「入社から 30 日以内に退職 → 100% 返金」のように段階を定義します。
        </p>
      </div>
      {state.message ? (
        <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "送信中..." : "作成"}
        </Button>
      </div>
    </form>
  );
}
