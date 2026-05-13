import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { findFacilityById } from "@/lib/repositories/facility";

import { updateFacilityAction, type FacilityActionState } from "../actions";
import { FacilityForm } from "../_facility-form";

export const metadata = { title: "施設編集 | グロウリンク" };
export const dynamic = "force-dynamic";

export default async function FacilityEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession("facilities:write");
  const { id } = await params;
  const facility = await findFacilityById(id);
  if (!facility) notFound();

  // bind: 第 1 引数に id を束縛して useActionState 互換のシグネチャを保つ
  const action = updateFacilityAction.bind(null, id) as unknown as (
    state: FacilityActionState,
    fd: FormData,
  ) => Promise<FacilityActionState>;

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">施設を編集: {facility.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <FacilityForm
            action={action}
            submitLabel="更新"
            defaults={{
              name: facility.name,
              category: facility.category,
              prefecture: facility.prefecture,
              city: facility.city,
              address: facility.address,
              fax: facility.fax,
              email: facility.email,
              isFaxPublic: facility.isFaxPublic,
              notes: facility.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
