import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import { findRefundPolicyById } from "@/lib/repositories/refund-policy";

export const dynamic = "force-dynamic";

type Tier = { withinDays: number; refundRate: number };

export default async function RefundPolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession("contracts:read");
  const p = await findRefundPolicyById(id);
  if (!p) notFound();
  const tiers = Array.isArray(p.tiers) ? (p.tiers as Tier[]) : [];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.description ? <p className="text-sm text-muted-foreground">{p.description}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">段階返金 (日数 ASC)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>退職までの日数</TableHead>
                <TableHead>返金率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={t.withinDays}>
                  <TableCell>{t.withinDays} 日以内</TableCell>
                  <TableCell>{Math.round(t.refundRate * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">この規定を適用している契約 ({p.contracts.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {p.contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">適用中の契約はありません。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {p.contracts.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/contracts/${c.id}`} className="text-primary hover:underline">
                    {c.facility.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin/refund-policies">一覧に戻る</Link>
      </Button>
    </div>
  );
}
