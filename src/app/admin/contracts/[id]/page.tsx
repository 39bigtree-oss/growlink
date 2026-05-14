import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasCapability } from "@/lib/auth/rbac";
import { requireAdminSession } from "@/lib/auth/session";
import { findContractById } from "@/lib/repositories/contract";

import { ContractStatusActions } from "./_status-actions";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireAdminSession("contracts:read");
  const canWrite = hasCapability(staff.role, "contracts:write");
  const c = await findContractById(id);
  if (!c) notFound();

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{c.facility.name} との契約</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/contracts" className="hover:underline">取引契約</Link> / {c.contractType}
          </p>
        </div>
        <Badge variant={c.status === "SIGNED" ? "default" : "outline"}>{c.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">契約条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">手数料率</div>
              <div className="font-semibold">{(Number(c.feeRate) * 100).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">入金サイト</div>
              <div>{c.paymentTermDays} 日</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">開始日</div>
              <div>{c.startDate.toISOString().slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">終了日</div>
              <div>{c.endDate ? c.endDate.toISOString().slice(0, 10) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">e-Sign プロバイダ</div>
              <div>{c.eSignProvider}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">サイン者</div>
              <div>{c.signedBy ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">サイン日</div>
              <div>{c.signedAt ? c.signedAt.toISOString().slice(0, 10) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">返金規定</div>
              <div>{c.refundPolicy?.name ?? "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ステータス操作</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractStatusActions id={c.id} status={c.status} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">この契約に紐づく紹介成立 ({c.placements.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {c.placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">紹介成立はまだありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {c.placements.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/placements/${p.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {p.startDate.toISOString().slice(0, 10)} 開始 / 手数料 ¥{Number(p.introductionFee).toLocaleString()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin/contracts">一覧に戻る</Link>
      </Button>
    </div>
  );
}
