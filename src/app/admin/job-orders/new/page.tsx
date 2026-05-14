import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { createJobOrderAction } from "../actions";
import { JobOrderForm } from "../_form";

export const metadata = { title: "求人案件 新規作成 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewJobOrderPage() {
  await requireAdminSession("job-orders:write");
  const facilities = await prisma.facility.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, prefecture: true, city: true },
  });

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">求人案件を新規作成</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">案件情報</CardTitle>
        </CardHeader>
        <CardContent>
          <JobOrderForm action={createJobOrderAction} facilities={facilities} submitLabel="作成" />
        </CardContent>
      </Card>
    </div>
  );
}
