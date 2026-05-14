import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeFunnel } from "@/lib/analytics/funnel";

/**
 * 申込 → 6 ヶ月生存までの 8 段階ファネル。
 * 各段階の前段比 / 始点比を bar 風に可視化。
 */
export async function FunnelCard() {
  const stages = await computeFunnel();
  const max = stages[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">採用ファネル (8 段階)</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {stages.map((s) => {
            const width = max > 0 ? (s.count / max) * 100 : 0;
            return (
              <li key={s.key} className="grid grid-cols-12 items-center gap-2">
                <span className="col-span-3 truncate text-xs">{s.label}</span>
                <div className="col-span-6 h-5 overflow-hidden rounded bg-muted/40">
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${Math.max(2, width)}%` }}
                    aria-label={`${s.label} ${s.count} 件`}
                  />
                </div>
                <span className="col-span-1 tabular-nums text-right text-xs">
                  {s.count}
                </span>
                <span className="col-span-2 text-right text-xs text-muted-foreground">
                  {s.conversionFromPrev != null
                    ? `prev ${(s.conversionFromPrev * 100).toFixed(0)}%`
                    : "—"}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          現在 status ベースの計測。履歴ベース (status を一度通過した) の計測は v2.0 で
          ApplicantStatusHistory テーブルを追加して厳密化予定。
        </p>
      </CardContent>
    </Card>
  );
}
