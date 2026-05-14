import Link from "next/link";
import { notFound } from "next/navigation";

import { FeatureStatusBanner } from "@/components/feature-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

import { RegisterMyNumberForm } from "./_form";

export const metadata = { title: "マイナンバー登録 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewMyNumberPage({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  const { applicantId } = await params;
  await requireAdminSession("my-number:write");
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { id: true, lastName: true, firstName: true },
  });
  if (!applicant) notFound();

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {applicant.lastName} {applicant.firstName} のマイナンバー登録
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/my-numbers" className="hover:underline">マイナンバー</Link> /{" "}
          <Link href={`/admin/my-numbers/${applicantId}`} className="hover:underline">求職者別ページ</Link>
        </p>
      </div>

      <FeatureStatusBanner featureKey="ocr.my_number_card" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">登録方法を選択</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterMyNumberForm applicantId={applicantId} />
        </CardContent>
      </Card>
    </div>
  );
}
