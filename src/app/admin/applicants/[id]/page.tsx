import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunDiagnosisButton } from "@/app/_shared/run-diagnosis-button";
import { requireAdminSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/rbac";
import {
  nextStatusOptions,
  statusLabel,
} from "@/lib/applicants/status-machine";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import { prisma } from "@/lib/db";

import { ApplicantTimeline, type TimelineEvent } from "./_timeline";
import { buildSkillSheetTabData } from "./_skill-sheet-data";
import { SkillSheetTab } from "./_skill-sheet-tab";
import { StatusTransitionButtons } from "./_status-transition";

export const metadata = { title: "申込詳細 | グロウリンク" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);
const GENDER_LABEL: Record<string, string> = { MALE: "男性", FEMALE: "女性", OTHER: "回答しない" };

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireAdminSession("applicants:read");
  const canWrite = hasCapability(staff.role, "applicants:write");
  const { id } = await params;

  const applicant = await prisma.applicant.findFirst({
    where: { id, deletedAt: null },
    include: {
      qualifications: true,
      diagnoses: { orderBy: { score: "desc" } },
      skillSheet: true,
      resumeUploads: { orderBy: { createdAt: "desc" } },
      skillSheetTokens: { orderBy: { createdAt: "desc" } },
      faxSheets: {
        orderBy: { createdAt: "desc" },
        include: {
          facility: { select: { name: true, prefecture: true, city: true } },
          reaction: { select: { interested: true, comment: true } },
        },
      },
    },
  });
  if (!applicant) notFound();
  const canFaxCreate = hasCapability(staff.role, "fax:create");

  const skillSheetTabData = buildSkillSheetTabData({
    skillSheet: applicant.skillSheet ?? null,
    resumes: applicant.resumeUploads ?? [],
    tokens: applicant.skillSheetTokens ?? [],
  });

  // 監査ログから「この申込に関するイベント」だけを時系列で抽出。
  const auditEvents = await prisma.auditLog.findMany({
    where: { target: applicant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { staff: { select: { name: true } } },
  });
  const timeline: TimelineEvent[] = [
    {
      id: `created-${applicant.id}`,
      action: "applicant.created",
      payload: null,
      createdAt: applicant.createdAt,
      staffName: "本人申込",
    },
    ...auditEvents.map((e) => ({
      id: e.id,
      action: e.action,
      payload: (e.payload as TimelineEvent["payload"]) ?? null,
      createdAt: e.createdAt,
      staffName: e.staff?.name ?? null,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const nextOptions = nextStatusOptions(applicant.status);
  const hasDiagnosis = applicant.diagnoses.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-6 min-w-0">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {applicant.lastName} {applicant.firstName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {applicant.lastNameKana} {applicant.firstNameKana} · 申込日{" "}
                {applicant.createdAt.toISOString().slice(0, 10)}
              </p>
            </div>
            <Badge variant="secondary">{statusLabel(applicant.status)}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/applicants">一覧へ戻る</Link>
            </Button>
            <StatusTransitionButtons
              applicantId={applicant.id}
              current={applicant.status}
              options={nextOptions}
              disabled={!canWrite}
            />
          </div>
          {!canWrite && (
            <p className="text-xs text-amber-700">
              閲覧権限のみのため、ステータス変更はできません。
            </p>
          )}
        </header>

        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">基本情報</TabsTrigger>
            <TabsTrigger value="qualifications">資格・希望</TabsTrigger>
            <TabsTrigger value="diagnosis">AI 診断結果</TabsTrigger>
            <TabsTrigger value="skill-sheet">スキルシート</TabsTrigger>
            <TabsTrigger value="interview">面接</TabsTrigger>
            <TabsTrigger value="fax">FAX 履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardContent className="grid grid-cols-1 gap-3 p-6 text-sm md:grid-cols-2">
                <Field label="メール" value={applicant.email} />
                <Field label="電話" value={applicant.phone} />
                <Field label="生年月日" value={applicant.birthDate.toISOString().slice(0, 10)} />
                <Field label="性別" value={GENDER_LABEL[applicant.gender] ?? applicant.gender} />
                <Field label="国籍" value={applicant.nationality ?? "未選択"} />
                <Field label="希望言語" value={applicant.language ?? "ja"} />
                <Field label="診断希望" value={applicant.wantsDiagnosis ? "あり" : "なし"} />
                <Field label="ステータス" value={statusLabel(applicant.status)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications">
            <Card>
              <CardContent className="space-y-4 p-6 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">保有資格</div>
                  <div>
                    {applicant.qualifications.length > 0
                      ? applicant.qualifications.map((q) => q.name).join(" / ")
                      : "なし"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">希望業態</div>
                  <div>
                    {applicant.desiredCategories.length > 0
                      ? applicant.desiredCategories
                          .map((c) => CATEGORY_LABELS[c] ?? c)
                          .join(" / ")
                      : "未選択"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnosis">
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
                        PDF ダウンロード
                      </a>
                    </Button>
                  )}
                  {canWrite && (
                    <RunDiagnosisButton
                      applicantId={applicant.id}
                      alreadyDiagnosed={hasDiagnosis}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {hasDiagnosis ? (
                  <div className="space-y-3">
                    <iframe
                      src={`/api/diagnosis/${applicant.id}/pdf`}
                      title="診断 PDF プレビュー"
                      className="h-[480px] w-full rounded-md border"
                    />
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
                              <td className="py-1 pr-2">
                                {CATEGORY_LABELS[d.category] ?? d.category}
                              </td>
                              <td className="py-1 pr-2">{d.score}</td>
                              <td className="py-1 pr-2 font-semibold">{d.rank}</td>
                              <td className="py-1 pr-2">{d.proComment}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <CardDescription>
                    まだ診断は実行されていません。「AI 診断を実行」ボタンから開始してください。
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skill-sheet">
            <SkillSheetTab
              applicantId={applicant.id}
              data={skillSheetTabData}
              canWrite={canWrite}
            />
          </TabsContent>

          <TabsContent value="interview">
            <PlaceholderCard
              title="AI 電話面接"
              phase="Phase 3"
              description="Twilio + Whisper + Claude による AI 電話面接の発信履歴・文字起こし・要約をここに表示します。"
            />
          </TabsContent>

          <TabsContent value="fax">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">FAX 送信履歴</CardTitle>
                {canFaxCreate && (
                  <Button asChild size="sm">
                    <Link href={`/admin/fax-sheets/new?applicantId=${applicant.id}`}>
                      新規 FAX 送信票を作成
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="text-sm">
                {applicant.faxSheets.length === 0 ? (
                  <CardDescription>
                    この求職者の FAX 送信票はまだ作成されていません。
                  </CardDescription>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-1 pr-2">施設</th>
                          <th className="py-1 pr-2">ステータス</th>
                          <th className="py-1 pr-2">反応</th>
                          <th className="py-1 pr-2">作成日</th>
                          <th className="py-1 pr-2">送信日</th>
                          <th className="py-1 pr-2 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applicant.faxSheets.map((s) => (
                          <tr key={s.id} className="border-b last:border-0">
                            <td className="py-1 pr-2">
                              <div className="font-medium">{s.facility.name}</div>
                              <div className="text-muted-foreground">
                                {s.facility.prefecture}
                                {s.facility.city}
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <Badge variant="muted">{s.status}</Badge>
                            </td>
                            <td className="py-1 pr-2">
                              {s.reaction
                                ? s.reaction.interested
                                  ? "興味あり"
                                  : "辞退"
                                : "未返信"}
                            </td>
                            <td className="py-1 pr-2">{s.createdAt.toISOString().slice(0, 10)}</td>
                            <td className="py-1 pr-2">
                              {s.sentAt ? s.sentAt.toISOString().slice(0, 10) : "─"}
                            </td>
                            <td className="py-1 pr-2 text-right">
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={`/api/fax-sheets/${s.id}/pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  PDF
                                </a>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">タイムライン</CardTitle>
            <CardDescription>申込以降のステータス遷移と主要操作</CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicantTimeline events={timeline} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-all">{value}</div>
    </div>
  );
}

function PlaceholderCard({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{phase} で実装予定です。</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  );
}
