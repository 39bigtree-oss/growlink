import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { createContractAction } from "../actions";
import { ContractForm } from "../_form";

export const metadata = { title: "契約 新規作成 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  await requireAdminSession("contracts:write");
  const [facilities, refundPolicies] = await Promise.all([
    prisma.facility.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.refundPolicy.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">取引契約を新規作成</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">契約情報</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractForm
            action={createContractAction}
            facilities={facilities}
            refundPolicies={refundPolicies}
            submitLabel="作成"
          />
        </CardContent>
      </Card>
    </div>
  );
}
