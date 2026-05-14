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
import { hasCapability } from "@/lib/auth/rbac";
import { requireAdminSession } from "@/lib/auth/session";
import { countJobOrders, listJobOrders } from "@/lib/repositories/job-order";

export const metadata = { title: "求人案件 | Tsumugi" };
export const dynamic = "force-dynamic";

const URGENCY_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "danger" | "outline" }> = {
  NORMAL: { label: "通常", variant: "outline" },
  URGENT: { label: "急募", variant: "secondary" },
  CRITICAL: { label: "最優先", variant: "danger" },
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "募集中",
  HOLD: "保留",
  FILLED: "充足",
  CLOSED: "終了",
};

export default async function JobOrdersListPage() {
  const staff = await requireAdminSession("job-orders:read");
  const canWrite = hasCapability(staff.role, "job-orders:write");
  const [items, total] = await Promise.all([listJobOrders({ take: 100 }), countJobOrders()]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">求人案件</h1>
          <p className="text-sm text-muted-foreground">
            施設からお預かりした個別の募集案件。マッチング・FAX 送信対象の単位。
          </p>
        </div>
        {canWrite ? (
          <Button asChild>
            <Link href="/admin/job-orders/new">新規作成</Link>
          </Button>
        ) : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">案件一覧 ({total} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="まだ案件がありません"
              description="施設マスタから「新規作成」で求人案件を登録できます。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>施設</TableHead>
                  <TableHead>職種 / 雇用</TableHead>
                  <TableHead>給与帯</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>緊急度</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((jo) => {
                  const wage =
                    jo.monthlyWageMin || jo.monthlyWageMax
                      ? `月給 ${(jo.monthlyWageMin ?? 0).toLocaleString()}〜${(jo.monthlyWageMax ?? 0).toLocaleString()} 円`
                      : jo.hourlyWageMin || jo.hourlyWageMax
                        ? `時給 ${jo.hourlyWageMin ?? "-"}〜${jo.hourlyWageMax ?? "-"} 円`
                        : "-";
                  const urgency = URGENCY_BADGE[jo.urgency] ?? URGENCY_BADGE.NORMAL;
                  return (
                    <TableRow key={jo.id}>
                      <TableCell>
                        <Link
                          href={`/admin/job-orders/${jo.id}`}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {jo.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {jo.facility.name}
                        <span className="block text-xs">{jo.facility.prefecture}{jo.facility.city}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{jo.position}</div>
                        <div className="text-xs text-muted-foreground">{jo.employmentType}</div>
                      </TableCell>
                      <TableCell className="text-sm">{wage}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUS_LABEL[jo.status] ?? jo.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={urgency.variant}>{urgency.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/job-orders/${jo.id}`}>詳細</Link>
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
