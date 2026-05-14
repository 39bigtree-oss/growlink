"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

import { issuePortalTokenAction } from "./actions";

export function IssuePortalTokenButton({ facilityId }: { facilityId: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [latestUrl, setLatestUrl] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await issuePortalTokenAction(facilityId);
            if (res.ok && res.url) {
              setLatestUrl(res.url);
              await navigator.clipboard.writeText(res.url).catch(() => {});
              toast({
                title: "ポータル URL を発行 + コピーしました",
                description: "メールや LINE で施設に共有してください",
                variant: "success",
              });
            } else {
              toast({
                title: "発行失敗",
                description: res.message,
                variant: "destructive",
              });
            }
          })
        }
      >
        {pending ? "発行中..." : "ポータル URL を発行"}
      </Button>
      {latestUrl ? (
        <Input
          readOnly
          value={latestUrl}
          className="font-mono text-[10px] md:w-96"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </div>
  );
}
