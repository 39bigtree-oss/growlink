import Link from "next/link";

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
import { computeArAging } from "@/lib/analytics/ar-aging";

/**
 * 売掛 AR Aging サマリ。経過日数別バケット + DSO。
 */
export async function ArAgingCard() {
  const aging = await computeArAging();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">売掛回収状況 (AR Aging)</CardTitle>
        <div className="text-xs text-muted-foreground">
          DSO (回収日数 平均): {aging.dsoDays != null ? `${aging.dsoDays} 日` : "—"}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>バケット</TableHead>
              <TableHead className="text-right">件数</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aging.buckets.map((b) => (
              <TableRow key={b.bucket}>
                <TableCell>
                  <Badge
                    variant={
                      b.bucket === "90plus"
                        ? "danger"
                        : b.bucket === "90" || b.bucket === "60"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {b.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ¥{b.totalAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {b.bucket === "90plus"
                    ? "要 法的対応 / 入金督促"
                    : b.bucket === "90"
                      ? "強い督促を推奨"
                      : b.bucket === "60"
                        ? "督促開始"
                        : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 flex justify-between text-sm">
          <span className="text-muted-foreground">未入金合計</span>
          <span className="font-semibold tabular-nums">
            ¥{aging.totalUnpaid.toLocaleString()}
          </span>
        </div>
        <p className="mt-3 text-xs">
          <Link
            href="/admin/invoices?status=OVERDUE"
            className="text-primary underline-offset-2 hover:underline"
          >
            OVERDUE の請求書を見る →
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
