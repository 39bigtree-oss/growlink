import Link from "next/link";

import { FeatureStatusBanner } from "@/components/feature-status";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { PlacementWizardForm } from "./_form";

export const metadata = { title: "紹介成立を作成 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewPlacementPage() {
  await requireAdminSession("placements:write");
  const [applicants, facilities, jobOrders, contracts] = await Promise.all([
    prisma.applicant.findMany({
      where: { deletedAt: null, status: { in: ["SALES_READY", "IN_INTRODUCTION", "INTERVIEW_DONE"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, lastName: true, firstName: true, status: true },
      take: 200,
    }),
    prisma.facility.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.jobOrder.findMany({
      where: { status: { in: ["OPEN", "HOLD"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        facilityId: true,
        employmentType: true,
        monthlyWageMin: true,
        monthlyWageMax: true,
      },
      take: 200,
    }),
    prisma.contract.findMany({
      where: { status: { in: ["SIGNED", "SENT"] } },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        facilityId: true,
        contractType: true,
        feeRate: true,
        paymentTermDays: true,
      },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">紹介成立を作成</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/placements" className="hover:underline">紹介成立</Link> / 新規
          (Wizard 形式)
        </p>
      </div>

      <div className="space-y-2">
        <FeatureStatusBanner featureKey="billing.invoice" />
        <FeatureStatusBanner featureKey="integration.e_sign" />
        <FeatureStatusBanner featureKey="integration.accounting" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <PlacementWizardForm
            applicants={applicants}
            facilities={facilities}
            jobOrders={jobOrders.map((j) => ({
              id: j.id,
              title: j.title,
              facilityId: j.facilityId,
              employmentType: j.employmentType,
              monthlyWageMin: j.monthlyWageMin,
              monthlyWageMax: j.monthlyWageMax,
            }))}
            contracts={contracts.map((c) => ({
              id: c.id,
              facilityId: c.facilityId,
              contractType: c.contractType,
              feeRate: Number(c.feeRate),
              paymentTermDays: c.paymentTermDays,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
