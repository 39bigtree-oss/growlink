import Link from "next/link";

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
import { hasCapability } from "@/lib/auth/rbac";
import { requireAdminSession } from "@/lib/auth/session";
import { listRefundPolicies } from "@/lib/repositories/refund-policy";

export const metadata = { title: "返金規定 | Tsumugi" };
export const dynamic = "force-dynamic";

type Tier = { withinDays: number; refundRate: number };

export default async function RefundPoliciesListPage() {
  const staff = await requireAdminSession("contracts:read");
  const canWrite = hasCapability(staff.role, "contracts:write");
  const items = await listRefundPolicies();

  return (
    <div className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">返金規定</h1>
          <p className="text-sm text-muted-foreground">
            早期退職時に施設へ返金する段階規定。契約に紐付けて運用する。
          </p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/admin/refund-policies/new">新規作成</Link>
          </Button>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">返金規定一覧 ({items.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="返金規定がまだ登録されていません" description="まずは「標準 90 日段階返金」を作りましょう。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>段階</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const tiers = Array.isArray(p.tiers) ? (p.tiers as Tier[]) : [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/admin/refund-policies/${p.id}`} className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                        {p.description ? (
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tiers
                          .map((t) => `${t.withinDays}日以内 ${Math.round(t.refundRate * 100)}%`)
                          .join(" / ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/refund-policies/${p.id}`}>詳細</Link>
                        </Button>
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
