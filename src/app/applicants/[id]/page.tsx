import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { prisma } from "@/lib/db";

import { RunDiagnosisButton } from "./run-diagnosis-button";

export const metadata = { title: "申込詳細 | グロウリンク" };

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const applicant = await prisma.applicant.findFirst({
    where: { id, deletedAt: null },
    include: {
      qualifications: true,
      diagnoses: { orderBy: { score: "desc" } },
    },
  });
  if (!applicant) notFound();

  const hasDiagnosis = applicant.diagnoses.length > 0;

  return (
    <main className="container mx-auto max-w-3xl space-y-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {applicant.lastName} {applicant.firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {applicant.email} / {applicant.phone}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/applicants">一覧に戻る</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1">
            <dt className="text-muted-foreground">フリガナ</dt>
            <dd>
              {applicant.lastNameKana} {applicant.firstNameKana}
            </dd>
            <dt className="text-muted-foreground">生年月日</dt>
            <dd>{applicant.birthDate.toISOString().slice(0, 10)}</dd>
            <dt className="text-muted-foreground">性別</dt>
            <dd>{applicant.gender}</dd>
            <dt className="text-muted-foreground">国籍</dt>
            <dd>{applicant.nationality ?? "未選択"}</dd>
            <dt className="text-muted-foreground">希望言語</dt>
            <dd>{applicant.language ?? "ja"}</dd>
            <dt className="text-muted-foreground">保有資格</dt>
            <dd>
              {applicant.qualifications.length > 0
                ? applicant.qualifications.map((q) => q.name).join(" / ")
                : "なし"}
            </dd>
            <dt className="text-muted-foreground">希望職種</dt>
            <dd>
              {applicant.desiredCategories.length > 0
                ? applicant.desiredCategories
                    .map((c) => CATEGORY_LABELS[c] ?? c)
                    .join(" / ")
                : "未選択"}
            </dd>
            <dt className="text-muted-foreground">診断希望</dt>
            <dd>{applicant.wantsDiagnosis ? "あり" : "なし"}</dd>
            <dt className="text-muted-foreground">ステータス</dt>
            <dd>{applicant.status}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">AI 適職診断</CardTitle>
          <div className="flex gap-2">
            {hasDiagnosis && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/api/diagnosis/${applicant.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF を開く
                </a>
              </Button>
            )}
            <RunDiagnosisButton applicantId={applicant.id} alreadyDiagnosed={hasDiagnosis} />
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          {hasDiagnosis ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1 pr-2">業態</th>
                    <th className="py-1 pr-2">スコア</th>
                    <th className="py-1 pr-2">ランク</th>
                    <th className="py-1 pr-2">向いている理由</th>
                  </tr>
                </thead>
                <tbody>
                  {applicant.diagnoses.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-1 pr-2">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                      <td className="py-1 pr-2">{d.score}</td>
                      <td className="py-1 pr-2 font-semibold">{d.rank}</td>
                      <td className="py-1 pr-2">{d.proComment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">
              まだ診断は実行されていません。「AI 診断を実行」ボタンから開始してください。
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
