import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BAND_LABEL,
  BAND_VARIANT,
  scoreAttritionRisk,
} from "@/lib/analytics/attrition-risk";
import { applyRefund } from "@/lib/billing/calc";
import { requireAdminSession } from "@/lib/auth/session";
import { findPlacementById } from "@/lib/repositories/placement";
import type { RefundTier } from "@/lib/schemas/contract";

export const dynamic = "force-dynamic";

export default async function PlacementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession("placements:read");
  const p = await findPlacementById(id);
  if (!p) notFound();

  const tiers = p.contract.refundPolicy && Array.isArray(p.contract.refundPolicy.tiers)
    ? (p.contract.refundPolicy.tiers as RefundTier[])
    : [];

  // 退職予兆スコア
  const risk = scoreAttritionRisk({
    startDate: p.startDate,
    attritionAt: p.attritionAt,
    monthlyWage: Number(p.monthlyWage),
    employmentType: p.jobOrder.employmentType,
    experienceYears: 0, // SkillSheet 連携は v1.7
    desiredMonthlyWage: null,
    shiftFitAxes: null,
  });

  // 退職予定で返金規定がどう適用されるかのシミュレーション (attritionAt があれば実値、無ければ "今日" 退職想定)
  const simulationAttrition = p.attritionAt ?? new Date();
  const refundSim = tiers.length
    ? applyRefund({
        introductionFee: Number(p.introductionFee),
        startDate: p.startDate,
        attritionAt: simulationAttrition,
        tiers,
      })
    : null;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">
          紹介成立: {p.applicant.lastName} {p.applicant.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/placements" className="hover:underline">紹介成立</Link> / {p.facility.name}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">案件</span><Link href={`/admin/job-orders/${p.jobOrder.id}`} className="text-primary hover:underline">{p.jobOrder.title}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">契約</span><Link href={`/admin/contracts/${p.contract.id}`} className="text-primary hover:underline">{p.contract.contractType}</Link></div>
            <div className="flex justify-between"><span className="text-muted-foreground">入社日</span><span>{p.startDate.toISOString().slice(0, 10)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">退職日</span><span>{p.endDate ? p.endDate.toISOString().slice(0, 10) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">月給</span><span>¥{Number(p.monthlyWage).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">紹介手数料</span><span>¥{Number(p.introductionFee).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">手数料状態</span><Badge variant={p.feeStatus === "PAID" ? "default" : "outline"}>{p.feeStatus}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">返金期限</span><span>{p.refundDueDate ? p.refundDueDate.toISOString().slice(0, 10) : "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">返金規定シミュレーション</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {refundSim && refundSim.tierApplied ? (
              <div className="space-y-2">
                <p>
                  {p.attritionAt ? "実退職日" : "本日"} までに {refundSim.withinDays} 日経過。
                </p>
                <p>
                  適用 tier: <strong>{refundSim.tierApplied.withinDays} 日以内</strong> → {Math.round(refundSim.tierApplied.refundRate * 100)}% 返金
                </p>
                <p className="text-base font-semibold text-destructive">
                  返金額: ¥{refundSim.refundAmount.toLocaleString()}
                </p>
              </div>
            ) : tiers.length === 0 ? (
              <p className="text-muted-foreground">契約に返金規定が設定されていません。</p>
            ) : (
              <p className="text-muted-foreground">返金規定の対象外 (規定日数を超過)。</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">退職予兆スコア</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold tabular-nums">{risk.score}</div>
            <Badge variant={BAND_VARIANT[risk.band]}>{BAND_LABEL[risk.band]}</Badge>
            <span className="text-xs text-muted-foreground">
              入社から {risk.monthsElapsed} ヶ月経過
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground">在籍月数カーブ</div>
              <div className="font-semibold">+{risk.contributors.tenureCurve}</div>
            </div>
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground">雇用形態</div>
              <div className="font-semibold">+{risk.contributors.employmentType}</div>
            </div>
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground">給与ギャップ</div>
              <div className="font-semibold">+{risk.contributors.wageGap}</div>
            </div>
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground">シフトミスマッチ</div>
              <div className="font-semibold">+{risk.contributors.shiftMismatch}</div>
            </div>
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground">経験不足</div>
              <div className="font-semibold">+{risk.contributors.experienceLow}</div>
            </div>
            {risk.contributors.realized > 0 ? (
              <div className="rounded border border-destructive bg-destructive/10 p-2">
                <div className="text-muted-foreground">退職実績</div>
                <div className="font-semibold">+{risk.contributors.realized}</div>
              </div>
            ) : null}
          </div>
          {risk.reasons.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {risk.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            ※ v1.6 はルールベース計算。退職実績データが十分溜まったら v2.0 で ML モデルに置換予定。
          </p>
        </CardContent>
      </Card>

      {p.dispatchLedger ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">派遣台帳</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Link href={`/admin/dispatch-ledgers/${p.dispatchLedger.id}`} className="text-primary hover:underline">
              台帳を開く →
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">紐づく請求書 ({p.invoices.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {p.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">請求書はまだ発行されていません。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {p.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link href={`/admin/invoices/${inv.id}`} className="text-primary hover:underline">
                    {inv.invoiceNumber}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ¥{Number(inv.totalAmount).toLocaleString()} ({inv.status})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin/placements">一覧に戻る</Link>
      </Button>
    </div>
  );
}
