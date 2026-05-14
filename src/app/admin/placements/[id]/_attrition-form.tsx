"use client";

import { useActionState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { setAttritionAction, type AttritionState } from "../actions";

const initial: AttritionState = { ok: false };

export function AttritionForm({
  placementId,
  currentAttrition,
  canWrite,
}: {
  placementId: string;
  currentAttrition: Date | null;
  canWrite: boolean;
}) {
  const bound = setAttritionAction.bind(null, placementId);
  const [state, dispatch, pending] = useActionState(bound, initial);
  const [clearing, startClear] = useTransition();

  if (!canWrite) {
    return (
      <p className="text-sm text-muted-foreground">
        退職記録の編集権限がありません (CONSULTANT 以上)。
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="attritionAt" className="text-xs">退職日</Label>
        <Input
          id="attritionAt"
          name="attritionAt"
          type="date"
          defaultValue={
            currentAttrition ? currentAttrition.toISOString().slice(0, 10) : ""
          }
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || clearing}>
          {pending ? "更新中..." : currentAttrition ? "退職日を更新" : "退職を記録"}
        </Button>
        {currentAttrition ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending || clearing}
            onClick={() =>
              startClear(() => {
                const fd = new FormData();
                fd.set("attritionAt", "");
                dispatch(fd);
              })
            }
          >
            退職記録をクリア
          </Button>
        ) : null}
      </div>
      {state.message ? (
        <p
          className={`w-full text-xs ${state.ok ? "text-green-700" : "text-destructive"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
