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
import { countPlacements, listPlacements } from "@/lib/repositories/placement";

export const metadata = { title: "紹介成立 | Tsumugi" };
export const dynamic = "force-dynamic";

const FEE_STATUS_LABEL: Record<string, string> = {
  PENDING: "未請求",
  INVOICED: "請求済",
  PAID: "入金済",
  REFUNDED: "返金済",
};

export default async function PlacementsListPage() {
  await requireAdminSession("placements:read");
  const [items, total] = await Promise.all([listPlacements({ take: 200 }), countPlacements()]);

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold">紹介成立</h1>
        <p className="text-sm text-muted-foreground">
          求職者 × 施設 × 求人案件 × 契約 の組み合わせで成立した紹介。手数料の請求・入金状況を追跡。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">成立一覧 ({total} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="紹介成立がまだありません" description="seed 経由で CONTRACTED な求職者を作ると Placement が生成されます。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>求職者</TableHead>
                  <TableHead>施設</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead>開始日</TableHead>
                  <TableHead>手数料</TableHead>
                  <TableHead>状況</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.applicant.lastName} {p.applicant.firstName}
                    </TableCell>
                    <TableCell>{p.facility.name}</TableCell>
                    <TableCell className="text-sm">{p.jobOrder.title}</TableCell>
                    <TableCell className="text-sm">{p.startDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>¥{Number(p.introductionFee).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={p.feeStatus === "PAID" ? "default" : "outline"}>
                        {FEE_STATUS_LABEL[p.feeStatus] ?? p.feeStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/placements/${p.id}`}>詳細</Link>
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
