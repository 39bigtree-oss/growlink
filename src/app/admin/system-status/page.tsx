import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminSession } from "@/lib/auth/session";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  FEATURES,
  resolveFeatureState,
  STATE_BADGE_VARIANT,
  STATE_LABEL,
  type FeatureCategory,
  type FeatureState,
} from "@/lib/system-status/features";

export const metadata = { title: "システム機能の状態 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function SystemStatusPage() {
  await requireAdminSession();

  // カテゴリごとにグループ化 + state 解決
  const byCategory = new Map<FeatureCategory, typeof FEATURES>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const f of FEATURES) {
    const list = byCategory.get(f.category);
    if (list) list.push(f);
  }

  // サマリ集計
  const counts: Record<FeatureState, number> = {
    READY: 0,
    MOCK: 0,
    LIMITED: 0,
    PLANNED: 0,
    ROADMAP: 0,
  };
  for (const f of FEATURES) {
    counts[resolveFeatureState(f)]++;
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">システム機能の状態</h1>
        <p className="text-sm text-muted-foreground">
          各機能の「本番運用可 / Mock / 制限あり / 未実装」を一覧で確認できます。
          mock 状態の機能でも UI と DB は動きますが、実際の外部送信などは行われません。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-5">
        {(["READY", "LIMITED", "MOCK", "PLANNED", "ROADMAP"] as FeatureState[]).map(
          (state) => (
            <Card key={state}>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">{STATE_LABEL[state]}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">{counts[state]}</span>
                  <Badge variant={STATE_BADGE_VARIANT[state]} className="text-[10px]">
                    {state}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const features = byCategory.get(cat) ?? [];
        if (features.length === 0) return null;
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-sm">{CATEGORY_LABEL[cat]} ({features.length} 件)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">状態</TableHead>
                    <TableHead>機能</TableHead>
                    <TableHead>プロバイダ / 制限</TableHead>
                    <TableHead className="w-32">予定</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((f) => {
                    const state = resolveFeatureState(f);
                    return (
                      <TableRow key={f.key}>
                        <TableCell>
                          <Badge variant={STATE_BADGE_VARIANT[state]}>
                            {STATE_LABEL[state]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">{f.summary}</div>
                          <code className="mt-1 inline-block text-[10px] text-muted-foreground">
                            {f.key}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs">
                          {f.provider ? <div>{f.provider}</div> : null}
                          {f.limits && f.limits.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
                              {f.limits.map((l, i) => (
                                <li key={i}>{l}</li>
                              ))}
                            </ul>
                          ) : null}
                          {f.productionCost ? (
                            <div className="mt-1 text-muted-foreground">
                              本番コスト: {f.productionCost}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {f.plannedVersion ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <div className="text-xs text-muted-foreground">
        この一覧は <code>src/lib/system-status/features.ts</code> をシングル・ソース・オブ・トゥルースとしています。
        新機能を追加するときはここに 1 行足してください。
      </div>
    </div>
  );
}
