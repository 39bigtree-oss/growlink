import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";

import { NewRefundPolicyForm } from "./_form";

export const metadata = { title: "返金規定 新規作成 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewRefundPolicyPage() {
  await requireAdminSession("contracts:write");
  return (
    <div className="space-y-5 p-6">
      <h1 className="text-2xl font-bold">返金規定を新規作成</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">規定情報</CardTitle>
        </CardHeader>
        <CardContent>
          <NewRefundPolicyForm />
        </CardContent>
      </Card>
    </div>
  );
}
