import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SEQUENCE_DEFINITIONS } from "@/lib/nurture/sequences";

import { RunNurtureScanButton } from "./_run-button";

export const metadata = { title: "ナーチャシナリオ | Tsumugi" };
export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  ACTIVE: { label: "実行中", variant: "default" as const },
  COMPLETED: { label: "完了", variant: "success" as const },
  CANCELLED: { label: "キャンセル", variant: "muted" as const },
  PAUSED: { label: "一時停止", variant: "warning" as const },
};

export default async function NurturePage() {
  await requireAdminSession();
  const [sequences, byStatus] = await Promise.all([
    prisma.nurtureSequence.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        applicant: { select: { lastName: true, firstName: true } },
        placement: { select: { id: true } },
      },
    }),
    prisma.nurtureSequence.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row.status] = row._count._all;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold">ナーチャシナリオ</h1>
          <p className="text-sm text-muted-foreground">
            「FAX 未反応 24h でリマインド」「スキルシート未提出 7 日で催促」など、
            営業の追客を自動化するシーケンス。
          </p>
        </div>
        <RunNurtureScanButton />
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        {(["ACTIVE", "COMPLETED", "CANCELLED", "PAUSED"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">{STATUS_BADGE[s].label}</div>
              <div className="text-2xl font-bold tabular-nums">{counts[s] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">シナリオ定義 ({SEQUENCE_DEFINITIONS.length} 種)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {SEQUENCE_DEFINITIONS.map((d) => (
              <li key={d.trigger} className="rounded border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{d.trigger}</Badge>
                  <span className="font-medium">{d.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
                <ol className="mt-1 list-decimal pl-5 text-xs">
                  {d.steps.map((s, i) => (
                    <li key={i}>
                      <Badge variant="muted" className="mr-1 text-[10px]">{s.kind}</Badge>
                      {s.label}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">直近の実行 ({sequences.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {sequences.length === 0 ? (
            <EmptyState
              title="シナリオはまだ起動されていません"
              description="FAX 送信 / スキルシート招待などのトリガーで自動起動 (実装は v1.9 で順次連携)。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>開始</TableHead>
                  <TableHead>トリガー</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>ステップ</TableHead>
                  <TableHead>次実行</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">
                      {s.startedAt.toISOString().slice(0, 16).replace("T", " ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{s.trigger}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.applicant
                        ? `${s.applicant.lastName} ${s.applicant.firstName}`
                        : s.placement
                          ? `Placement: ${s.placement.id.slice(0, 8)}…`
                          : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      step {s.currentStep + 1} / {Array.isArray(s.steps) ? s.steps.length : "?"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.nextRunAt
                        ? s.nextRunAt.toISOString().slice(0, 16).replace("T", " ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status].variant}>
                        {STATUS_BADGE[s.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
