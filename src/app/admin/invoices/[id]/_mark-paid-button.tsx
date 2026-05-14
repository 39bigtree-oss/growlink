"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { markInvoicePaidAction } from "../actions";

export function MarkPaidButton({ id }: { id: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await markInvoicePaidAction(id);
          toast({
            title: res.ok ? "入金済にしました" : "更新失敗",
            description: res.message,
            variant: res.ok ? "success" : "destructive",
          });
        })
      }
    >
      {pending ? "更新中..." : "入金済にする"}
    </Button>
  );
}
