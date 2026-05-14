import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { daysUntilAntiteishoku } from "@/lib/compliance/anti-teishoku";
import { listDispatchLedgers } from "@/lib/repositories/dispatch-ledger";

export const metadata = { title: "派遣台帳 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function DispatchLedgersListPage() {
  await requireAdminSession("dispatch-ledger:read");
  const items = await listDispatchLedgers({ take: 200 });

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">派遣台帳</h1>
        <p className="text-sm text-muted-foreground">
          派遣業法に基づく法定台帳。抵触日 90 日以内のものは赤色アラートで強調。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">台帳一覧 ({items.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="派遣台帳がまだありません" description="派遣形態の Placement を作ると自動で台帳が生成されます (v1.5 では seed 経由)。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>労働者</TableHead>
                  <TableHead>派遣先</TableHead>
                  <TableHead>業務</TableHead>
                  <TableHead>派遣期間</TableHead>
                  <TableHead>抵触日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => {
                  const remaining = daysUntilAntiteishoku(l.antiteishokuDate);
                  const approaching = remaining >= 0 && remaining <= 90;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        {l.applicant.lastName} {l.applicant.firstName}
                      </TableCell>
                      <TableCell>{l.facility.name}</TableCell>
                      <TableCell className="text-sm">{l.jobOrder.title}</TableCell>
                      <TableCell className="text-sm">
                        {l.dispatchPeriodStart.toISOString().slice(0, 10)} 〜{" "}
                        {l.dispatchPeriodEnd.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <div>{l.antiteishokuDate.toISOString().slice(0, 10)}</div>
                        {approaching ? (
                          <Badge variant="danger" className="mt-1">
                            残り {remaining} 日
                          </Badge>
                        ) : remaining < 0 ? (
                          <Badge variant="danger" className="mt-1">超過</Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1">余裕あり</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/dispatch-ledgers/${l.id}`}>詳細</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/api/dispatch-ledgers/${l.id}/pdf`} target="_blank">
                              PDF
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
