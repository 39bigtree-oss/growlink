"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { runNurtureScanAction } from "./actions";

export function RunNurtureScanButton() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await runNurtureScanAction();
          toast({
            title: res.ok ? "scan を実行しました" : "失敗",
            description: res.message,
            variant: res.ok ? "success" : "destructive",
          });
        })
      }
    >
      {pending ? "実行中..." : "scan を今すぐ実行"}
    </Button>
  );
}
