import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { findMyNumberByApplicantId } from "@/lib/repositories/my-number";

import { RevealMyNumberPanel } from "./_reveal-panel";

export const dynamic = "force-dynamic";

export default async function MyNumberDetailPage({
  params,
}: {
  params: Promise<{ applicantId: string }>;
}) {
  const { applicantId } = await params;
  const staff = await requireAdminSession("my-number:read");
  const applicant = await prisma.applicant.findUnique({
    where: { id: applicantId },
    select: { id: true, lastName: true, firstName: true },
  });
  if (!applicant) notFound();
  const record = await findMyNumberByApplicantId(applicantId);

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {applicant.lastName} {applicant.firstName} のマイナンバー
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/my-numbers" className="hover:underline">マイナンバー</Link> /{" "}
          <Link href={`/admin/applicants/${applicantId}`} className="hover:underline">求職者詳細</Link>
        </p>
      </div>

      {!record ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            この求職者のマイナンバーは登録されていません。
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">登録情報 (機微なため詳細は閲覧申請で開示)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">用途</div>
                  <Badge variant="outline">{record.purpose}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">暗号化日時</div>
                  <div>{record.encryptedAt.toISOString().slice(0, 16).replace("T", " ")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">保管期限</div>
                  <div>{record.retentionUntil.toISOString().slice(0, 10)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">表示権限</div>
                  <Badge variant={staff.role === "ADMIN" ? "default" : "outline"}>
                    {staff.role === "ADMIN" ? "ADMIN: 平文閲覧可" : `${staff.role}: マスクのみ`}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">閲覧申請 (理由必須)</CardTitle>
            </CardHeader>
            <CardContent>
              <RevealMyNumberPanel applicantId={applicantId} role={staff.role} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">アクセス履歴 (直近 50 件)</CardTitle>
            </CardHeader>
            <CardContent>
              {record.accessLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">アクセス履歴はまだありません。</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {record.accessLogs.map((log) => (
                    <li key={log.id} className="flex items-start justify-between border-b pb-2">
                      <div>
                        <div className="font-medium">
                          {log.staff.name} <span className="text-xs text-muted-foreground">({log.staff.role})</span>{" "}
                          が <Badge variant="outline">{log.action}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">理由: {log.reason}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.accessedAt.toISOString().slice(0, 16).replace("T", " ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Button asChild variant="outline">
        <Link href="/admin/my-numbers">一覧に戻る</Link>
      </Button>
    </div>
  );
}
