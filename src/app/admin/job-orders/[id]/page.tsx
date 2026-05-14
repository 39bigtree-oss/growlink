import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { hasCapability } from "@/lib/auth/rbac";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findJobOrderById } from "@/lib/repositories/job-order";

import { updateJobOrderAction } from "../actions";
import { JobOrderForm, type JobOrderFormDefaults } from "../_form";
import { JobOrderMatchingPanel } from "./_matching-panel";

export const dynamic = "force-dynamic";

export default async function JobOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireAdminSession("job-orders:read");
  const canWrite = hasCapability(staff.role, "job-orders:write");
  const jo = await findJobOrderById(id);
  if (!jo) notFound();

  const facilities = await prisma.facility.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, prefecture: true, city: true },
  });

  const defaults: JobOrderFormDefaults = {
    facilityId: jo.facilityId,
    title: jo.title,
    position: jo.position,
    employmentType: jo.employmentType,
    hourlyWageMin: jo.hourlyWageMin,
    hourlyWageMax: jo.hourlyWageMax,
    monthlyWageMin: jo.monthlyWageMin,
    monthlyWageMax: jo.monthlyWageMax,
    shiftPattern: jo.shiftPattern as JobOrderFormDefaults["shiftPattern"],
    requiredQualifications: jo.requiredQualifications,
    preferredQualifications: jo.preferredQualifications,
    minExperienceYears: jo.minExperienceYears,
    headcount: jo.headcount,
    status: jo.status,
    urgency: jo.urgency,
    startDate: jo.startDate ? jo.startDate.toISOString().slice(0, 10) : undefined,
    endDate: jo.endDate ? jo.endDate.toISOString().slice(0, 10) : undefined,
    nearestStation: jo.nearestStation,
    notes: jo.notes,
  };

  const updateAction = updateJobOrderAction.bind(null, id);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{jo.title}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/job-orders" className="hover:underline">求人案件</Link>
            <span className="mx-1">/</span>
            <span>{jo.facility.name}</span>
          </p>
        </div>
        <Badge variant={jo.urgency === "CRITICAL" ? "danger" : "outline"}>
          {jo.status} / {jo.urgency}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">マッチング: この案件に合う求職者</CardTitle>
        </CardHeader>
        <CardContent>
          <JobOrderMatchingPanel jobOrderId={jo.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">紹介成立 ({jo.placements.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {jo.placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">この案件に対する紹介成立はまだありません。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {jo.placements.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {p.applicant.lastName} {p.applicant.firstName} —{" "}
                    {p.startDate.toISOString().slice(0, 10)} 開始
                  </span>
                  <Link
                    href={`/admin/placements/${p.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    詳細
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">案件情報の編集</CardTitle>
        </CardHeader>
        <CardContent>
          {canWrite ? (
            <JobOrderForm
              action={updateAction}
              defaults={defaults}
              facilities={facilities}
              submitLabel="更新"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              編集権限がありません (閲覧のみ)。
            </p>
          )}
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href="/admin/job-orders">一覧に戻る</Link>
        </Button>
      </div>
    </div>
  );
}
