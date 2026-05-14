import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FEATURES,
  resolveFeatureState,
  STATE_BADGE_VARIANT,
  STATE_LABEL,
  type FeatureState,
} from "@/lib/system-status/features";

/**
 * ダッシュボード上部に置く「運用モード」カード。
 * 「いま何が本物で、何が mock か」をスタッフに 1 秒で示す。
 */
export function OperatingModePanel() {
  const counts: Record<FeatureState, number> = {
    READY: 0,
    MOCK: 0,
    LIMITED: 0,
    PLANNED: 0,
    ROADMAP: 0,
  };
  const mockedExamples: string[] = [];
  for (const f of FEATURES) {
    const s = resolveFeatureState(f);
    counts[s]++;
    if (s === "MOCK" && mockedExamples.length < 4) mockedExamples.push(f.name);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>運用モード</span>
          <Link
            href="/admin/system-status"
            className="text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
          >
            詳細 →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(["READY", "LIMITED", "MOCK", "PLANNED", "ROADMAP"] as FeatureState[]).map(
            (s) =>
              counts[s] > 0 ? (
                <Badge key={s} variant={STATE_BADGE_VARIANT[s]}>
                  {STATE_LABEL[s]} {counts[s]}
                </Badge>
              ) : null,
          )}
        </div>
        {counts.MOCK > 0 ? (
          <p className="text-xs text-muted-foreground">
            <strong>Mock 中:</strong> {mockedExamples.join(" / ")}
            {counts.MOCK > mockedExamples.length ? ` 他 ${counts.MOCK - mockedExamples.length} 件` : ""}
            。これらの機能は UI と DB は動きますが、外部送信などは行われません。
          </p>
        ) : (
          <p className="text-xs text-emerald-700">
            すべての機能が本番接続済 (READY)。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
