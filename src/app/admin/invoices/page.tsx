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
import { FeatureStatusBanner } from "@/components/feature-status";
import { requireAdminSession } from "@/lib/auth/session";
import { countInvoices, listInvoices, sumInvoiceTotals } from "@/lib/repositories/invoice";

export const metadata = { title: "請求書 | Tsumugi" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  ISSUED: "発行済",
  PAID: "入金済",
  OVERDUE: "支払遅延",
  VOID: "取消",
};

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminSession("invoices:read");
  const sp = await searchParams;
  const statusFilter =
    sp.status === "OVERDUE" || sp.status === "ISSUED" || sp.status === "PAID"
      ? sp.status
      : undefined;
  const [items, total, totals] = await Promise.all([
    listInvoices({ take: 200, status: statusFilter }),
    countInvoices({ status: statusFilter }),
    sumInvoiceTotals(),
  ]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">請求書</h1>
          <p className="text-sm text-muted-foreground">
            紹介手数料 / 派遣費用の請求書管理。会計連携 (mock) で CSV エクスポート可能。
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/invoices/export" target="_blank">CSV エクスポート</a>
        </Button>
      </header>

      <FeatureStatusBanner featureKey="integration.accounting" />

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">発行済 合計</div>
            <div className="text-xl font-semibold">¥{totals.issuedAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">入金済 合計</div>
            <div className="text-xl font-semibold text-green-700">
              ¥{totals.paidAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">遅延 合計</div>
            <div className="text-xl font-semibold text-destructive">
              ¥{totals.overdueAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">請求書一覧 ({total} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="請求書がまだありません" description="Placement (紹介成立) を作ると seed で 1 件発行されます。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>請求番号</TableHead>
                  <TableHead>施設</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>期日</TableHead>
                  <TableHead>合計</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.facility.name}</TableCell>
                    <TableCell className="text-sm">{inv.issuedAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-sm">{inv.dueAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>¥{Number(inv.totalAmount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "PAID" ? "default" : inv.status === "OVERDUE" ? "danger" : "outline"}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/invoices/${inv.id}`}>詳細</Link>
                      </Button>
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
