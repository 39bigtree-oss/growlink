import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { daysUntilAntiteishoku } from "@/lib/compliance/anti-teishoku";
import { findDispatchLedgerById } from "@/lib/repositories/dispatch-ledger";

export const dynamic = "force-dynamic";

export default async function DispatchLedgerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession("dispatch-ledger:read");
  const l = await findDispatchLedgerById(id);
  if (!l) notFound();
  const remaining = daysUntilAntiteishoku(l.antiteishokuDate);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {l.applicant.lastName} {l.applicant.firstName} の派遣台帳
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/dispatch-ledgers" className="hover:underline">派遣台帳</Link> /{" "}
            {l.facility.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href={`/api/dispatch-ledgers/${l.id}/pdf`} target="_blank">PDF 表示</a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">台帳 PDF プレビュー</CardTitle>
        </CardHeader>
        <CardContent>
          <iframe
            src={`/api/dispatch-ledgers/${l.id}/pdf`}
            title="派遣台帳 PDF"
            className="h-[640px] w-full rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">台帳情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">派遣期間</div>
              <div>
                {l.dispatchPeriodStart.toISOString().slice(0, 10)} 〜{" "}
                {l.dispatchPeriodEnd.toISOString().slice(0, 10)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">抵触日</div>
              <div className="flex items-center gap-2">
                {l.antiteishokuDate.toISOString().slice(0, 10)}
                {remaining >= 0 && remaining <= 90 ? (
                  <Badge variant="danger">残り {remaining} 日</Badge>
                ) : remaining < 0 ? (
                  <Badge variant="danger">超過</Badge>
                ) : null}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">契約締結回数</div>
              <div>{l.contractCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">派遣元責任者</div>
              <div>{l.dispatchManagerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">派遣先責任者</div>
              <div>{l.receivingManagerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">社会保険加入</div>
              <div>{l.socialInsuranceEnrolled ? "加入済" : "未加入"}</div>
            </div>
            {l.notes ? (
              <div className="md:col-span-3">
                <div className="text-xs text-muted-foreground">備考</div>
                <div className="whitespace-pre-wrap">{l.notes}</div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin/dispatch-ledgers">一覧に戻る</Link>
      </Button>
    </div>
  );
}
