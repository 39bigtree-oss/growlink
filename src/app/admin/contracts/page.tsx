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
import { countContracts, listContracts } from "@/lib/repositories/contract";

export const metadata = { title: "取引契約 | Tsumugi" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  DISPATCH_AGREEMENT: "派遣基本契約",
  INTRODUCTION_FEE: "紹介手数料契約",
  TEMP_TO_PERM: "紹介予定派遣",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  SENT: "送付済",
  SIGNED: "締結済",
  EXPIRED: "期限切れ",
  CANCELLED: "解約",
};

export default async function ContractsListPage() {
  const staff = await requireAdminSession("contracts:read");
  const canWrite = hasCapability(staff.role, "contracts:write");
  const [items, total] = await Promise.all([listContracts({ take: 100 }), countContracts()]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">取引契約</h1>
          <p className="text-sm text-muted-foreground">
            施設との紹介・派遣契約。手数料率と返金規定を結びつける単位。
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/refund-policies">返金規定</Link>
          </Button>
          {canWrite ? (
            <Button asChild>
              <Link href="/admin/contracts/new">新規作成</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">契約一覧 ({total} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="契約はまだ登録されていません" description="「新規作成」から始めてください。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>施設</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>手数料率</TableHead>
                  <TableHead>入金サイト</TableHead>
                  <TableHead>開始</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.facility.name}</TableCell>
                    <TableCell>{TYPE_LABEL[c.contractType] ?? c.contractType}</TableCell>
                    <TableCell>{(Number(c.feeRate) * 100).toFixed(2)}%</TableCell>
                    <TableCell>{c.paymentTermDays} 日</TableCell>
                    <TableCell>{c.startDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "SIGNED" ? "default" : "outline"}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/contracts/${c.id}`}>詳細</Link>
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
