import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createFacilityAction } from "../actions";
import { FacilityForm } from "../_facility-form";
import { requireAdminSession } from "@/lib/auth/session";

export const metadata = { title: "施設新規作成 | グロウリンク" };

export default async function NewFacilityPage() {
  await requireAdminSession("facilities:write");
  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight">施設を新規作成</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <FacilityForm action={createFacilityAction} submitLabel="作成" />
        </CardContent>
      </Card>
    </div>
  );
}
