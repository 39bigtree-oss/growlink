import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OperatingModePanel } from "@/components/operating-mode-panel";
import { computeSurvivalRates } from "@/lib/analytics/survival-rate";
import { requireAdminSession } from "@/lib/auth/session";
import { loadDashboardKpi } from "@/lib/dashboard/kpi";
import {
  getDailyMetrics,
  getFacilityResponseStats,
  getGlobalKpis,
} from "@/lib/repositories/sales-metrics";

import { DailyMetricsChart } from "./_daily-chart";
import { StatusBreakdownChart } from "./_status-chart";
import { FunnelCard } from "./_funnel-card";
import { ArAgingCard } from "./_aging-card";

export const metadata = { title: "ダッシュボード | グロウリンク" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdminSession();
  const [kpi, sales, daily, facilityStats, survival] = await Promise.all([
    loadDashboardKpi(),
    getGlobalKpis(),
    getDailyMetrics(30),
    getFacilityResponseStats(20),
    computeSurvivalRates(),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">
          全期間の主要 KPI と、過去 30 日のトレンド、施設別の反応率を表示します。
        </p>
      </div>

      <OperatingModePanel />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="今日の申込数" value={`${kpi.todayApplicants}`} description="今日 00:00 以降に受け付けた件数" />
        <KpiCard title="今月の申込数" value={`${kpi.monthApplicants}`} description="今月 1 日以降の累計" />
        <KpiCard title="診断完了率" value={`${kpi.diagnosisCompletionRate}%`} description="診断希望者のうち診断が走った割合" />
        <KpiCard title="平均診断スコア" value={kpi.averageDiagnosisScore.toFixed(1)} description="全業態 × 全申込の平均 (0-100)" />
        <KpiCard title="FAX 送信総数" value={`${sales.totalFaxSent}`} description="累計の SENT 件数" />
        <KpiCard title="返信率" value={`${(sales.replyRate * 100).toFixed(1)}%`} description="FAX 送信のうち反応が返ってきた割合" />
        <KpiCard title="興味あり率" value={`${(sales.interestedRate * 100).toFixed(1)}%`} description="FAX 送信のうち興味ありと回答された割合" />
        <KpiCard title="成約率" value={`${(sales.contractRate * 100).toFixed(1)}%`} description="全申込のうち成約に至った割合" />
        <KpiCard
          title="6ヶ月生存率"
          value={
            survival.m6.evaluable > 0
              ? `${(survival.m6.rate * 100).toFixed(1)}%`
              : "—"
          }
          description={`入社後 6 ヶ月以上経過した ${survival.m6.evaluable} 件の Placement のうち、6 ヶ月時点で在籍中`}
        />
        <KpiCard
          title="12ヶ月生存率"
          value={
            survival.m12.evaluable > 0
              ? `${(survival.m12.rate * 100).toFixed(1)}%`
              : "—"
          }
          description={`入社後 12 ヶ月以上経過した ${survival.m12.evaluable} 件中の在籍率`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <FunnelCard />
        <ArAgingCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">過去 30 日のトレンド</CardTitle>
          <CardDescription>申込・FAX 送信・返信の日次推移</CardDescription>
        </CardHeader>
        <CardContent>
          <DailyMetricsChart data={daily} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ステータス別件数</CardTitle>
            <CardDescription>申込が今どこに溜まっているかを俯瞰します</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBreakdownChart
              data={kpi.statusBreakdown.map((s) => ({ label: s.label, count: s.count }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">施設別 反応率 Top 20</CardTitle>
            <CardDescription>送信件数の多い順で、返信率・興味あり率を表示</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>施設</TableHead>
                  <TableHead className="text-right">送信</TableHead>
                  <TableHead className="text-right">返信</TableHead>
                  <TableHead className="text-right">興味</TableHead>
                  <TableHead className="text-right">返信率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilityStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      まだ FAX が送信されていません。
                    </TableCell>
                  </TableRow>
                ) : (
                  facilityStats.map((row) => (
                    <TableRow key={row.facilityId}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{row.facilityName}</div>
                        <div className="text-muted-foreground">{row.prefecture}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{row.sent}</TableCell>
                      <TableCell className="text-right text-xs">{row.replied}</TableCell>
                      <TableCell className="text-right text-xs">{row.interested}</TableCell>
                      <TableCell className="text-right text-xs">
                        {(row.replyRate * 100).toFixed(0)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{description}</CardContent>
    </Card>
  );
}
