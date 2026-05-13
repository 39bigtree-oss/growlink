import { Clock } from "lucide-react";

import { statusLabel } from "@/lib/applicants/status-machine";
import type { ApplicantStatus } from "@prisma/client";

export type TimelineEvent = {
  id: string;
  action: string;
  payload: { from?: string; to?: string; provider?: string } | null;
  createdAt: Date;
  staffName?: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  "applicant.created": "申込受付",
  "applicant.status_change": "ステータス変更",
  "diagnosis.run": "AI 診断実行",
};

export function ApplicantTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">タイムラインはまだありません。</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const label = ACTION_LABEL[e.action] ?? e.action;
        const detail = describe(e);
        return (
          <li key={e.id} className="flex gap-3 text-sm">
            <div className="mt-0.5 shrink-0 rounded-full border bg-background p-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{label}</div>
              {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
              <div className="text-xs text-muted-foreground">
                {e.createdAt.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                {e.staffName ?? "system"}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function describe(e: TimelineEvent): string | null {
  if (e.action === "applicant.status_change" && e.payload?.from && e.payload?.to) {
    return `${statusLabel(e.payload.from as ApplicantStatus)} → ${statusLabel(e.payload.to as ApplicantStatus)}`;
  }
  if (e.action === "diagnosis.run" && e.payload?.provider) {
    return `provider: ${e.payload.provider}`;
  }
  return null;
}
