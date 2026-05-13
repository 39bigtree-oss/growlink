import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata = { title: "申込一覧 | グロウリンク" };

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "受付",
  DIAGNOSED: "診断完了",
  SKILL_SHEET_INPROGRESS: "スキルシート作成中",
  SKILL_SHEET_DONE: "スキルシート完了",
  INTERVIEW_DONE: "面接完了",
  SALES_READY: "営業準備完了",
  IN_INTRODUCTION: "紹介中",
  CONTRACTED: "成約",
  REJECTED: "辞退",
};

export default async function ApplicantsListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const applicants = await prisma.applicant.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      lastName: true,
      firstName: true,
      email: true,
      status: true,
      wantsDiagnosis: true,
      createdAt: true,
    },
  });

  return (
    <main className="container mx-auto max-w-5xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">申込一覧</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">ダッシュボードへ</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近の申込 (最大 50 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {applicants.length === 0 ? (
            <p className="text-sm text-muted-foreground">申込はまだありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">氏名</th>
                    <th className="py-2 pr-3">メール</th>
                    <th className="py-2 pr-3">診断希望</th>
                    <th className="py-2 pr-3">ステータス</th>
                    <th className="py-2 pr-3">受付日</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        {a.lastName} {a.firstName}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{a.email}</td>
                      <td className="py-2 pr-3">{a.wantsDiagnosis ? "あり" : "なし"}</td>
                      <td className="py-2 pr-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-xs">
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {a.createdAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/applicants/${a.id}`} className="text-sm underline">
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
