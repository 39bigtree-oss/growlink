import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { loadDashboardKpi } from "@/lib/dashboard/kpi";

import { StatusBreakdownChart } from "./_status-chart";

export const metadata = { title: "ダッシュボード | グロウリンク" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdminSession();
  const kpi = await loadDashboardKpi();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">本日と今月の主要指標と、ステータス別の申込件数</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="今日の申込数"
          value={`${kpi.todayApplicants}`}
          description="今日 00:00 以降に受け付けた件数"
        />
        <KpiCard
          title="今月の申込数"
          value={`${kpi.monthApplicants}`}
          description="今月 1 日以降の累計"
        />
        <KpiCard
          title="診断完了率"
          value={`${kpi.diagnosisCompletionRate}%`}
          description="診断希望者のうち診断が走った割合"
        />
        <KpiCard
          title="平均診断スコア"
          value={kpi.averageDiagnosisScore.toFixed(1)}
          description="全業態 × 全申込の平均 (0-100)"
        />
      </div>

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
