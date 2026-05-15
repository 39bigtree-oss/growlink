import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureStatusBanner } from "@/components/feature-status";
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
import { InterviewTab } from "./_interview-tab";
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
      interview: {
        include: {
          turns: { orderBy: { turnIndex: "asc" } },
          tokens: { orderBy: { createdAt: "desc" } },
        },
      },
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
  const canInterviewWrite = hasCapability(staff.role, "interviews:write");

  const interviewTabData = {
    interview: applicant.interview
      ? {
          id: applicant.interview.id,
          status: applicant.interview.status,
          channel: applicant.interview.channel,
          provider: applicant.interview.provider,
          language: applicant.interview.language,
          startedAt: applicant.interview.startedAt,
          endedAt: applicant.interview.endedAt,
          durationSec: applicant.interview.durationSec,
          transcript: applicant.interview.transcript,
          summary: applicant.interview.summary,
          turns: applicant.interview.turns.map((t) => ({
            turnIndex: t.turnIndex,
            role: t.role,
            text: t.text,
            createdAt: t.createdAt,
          })),
          activeToken: (() => {
            const now = Date.now();
            const t = applicant.interview.tokens.find(
              (tt) => !tt.revokedAt && tt.expiresAt.getTime() > now,
            );
            return t ? { token: t.token, expiresAt: t.expiresAt } : null;
          })(),
        }
      : null,
  };

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
              <CardContent className="space-y-3">
                <FeatureStatusBanner featureKey="ai.diagnosis" />
                {hasDiagnosis ? (
                  <div className="space-y-5">
                    {/* v1.3: 11 業態の視覚的スコアバー (実運用イメージで一目で見られる) */}
                    <section>
                      <h3 className="mb-2 text-sm font-semibold">業態別スコア</h3>
                      <p className="mb-3 text-xs text-muted-foreground">
                        スコア (0〜100) を視覚化。スコアが高い業態ほど候補者にフィットしやすいと判定されています。
                      </p>
                      <ul className="space-y-2">
                        {[...applicant.diagnoses]
                          .sort((a, b) => b.score - a.score)
                          .map((d) => (
                            <li key={d.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-medium">
                                  {CATEGORY_LABELS[d.category] ?? d.category}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="tabular-nums text-muted-foreground">
                                    {d.score}
                                  </span>
                                  <RankPill rank={d.rank} />
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    rankBarColor(d.rank),
                                  )}
                                  style={{ width: `${Math.min(100, d.score)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">向いている点: </span>
                                {d.proComment}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">留意点: </span>
                                {d.conComment}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </section>

                    {/* v2.0: 求職者向け / 施設向けの 2 種類 PDF */}
                    <section className="space-y-5">
                      <div>
                        <h3 className="mb-1 text-sm font-semibold">
                          📨 求職者へ送信される PDF (v2.0 新版)
                          <Badge variant="success" className="ml-2 text-[10px]">NEW</Badge>
                        </h3>
                        <p className="mb-3 text-xs text-muted-foreground">
                          16 タイプ × 4 軸プロファイル × 強み TOP3 × 希望業態フィット × 隠れた適性 × 相性の良い同僚タイプ。
                          A4 1 枚に収めて「もらって嬉しい」フォーマットに。
                        </p>
                        <iframe
                          src={`/api/diagnosis/v2/${applicant.id}/applicant`}
                          title="v2 求職者向け診断 PDF"
                          className="h-[680px] w-full rounded-md border"
                        />
                      </div>
                      <div>
                        <h3 className="mb-1 text-sm font-semibold">
                          🏥 施設・紹介先へ送る PDF (v2.0 業務版)
                          <Badge variant="success" className="ml-2 text-[10px]">NEW</Badge>
                        </h3>
                        <p className="mb-3 text-xs text-muted-foreground">
                          氏名はイニシャル化 (PII 最小化)。業務適性・留意点を客観データで提示。
                        </p>
                        <iframe
                          src={`/api/diagnosis/v2/${applicant.id}/facility`}
                          title="v2 施設向け診断 PDF"
                          className="h-[680px] w-full rounded-md border"
                        />
                      </div>
                      <details className="rounded-md border bg-muted/30 p-3 text-xs">
                        <summary className="cursor-pointer">v1 旧 PDF を表示する (アーカイブ)</summary>
                        <iframe
                          src={`/api/diagnosis/${applicant.id}/pdf`}
                          title="v1 旧診断 PDF"
                          className="mt-3 h-[600px] w-full rounded-md border"
                        />
                      </details>
                    </section>
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
            <InterviewTab
              applicantId={applicant.id}
              data={interviewTabData}
              canWrite={canInterviewWrite}
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
                  <div className="space-y-5">
                    {/* v1.3: 最新の FAX 送信票を PDF で大きくプレビュー (実運用の現物) */}
                    <section>
                      <h3 className="mb-1 text-sm font-semibold">
                        最新の FAX 送信票プレビュー
                      </h3>
                      <p className="mb-3 text-xs text-muted-foreground">
                        宛先: {applicant.faxSheets[0].facility.name} (
                        {applicant.faxSheets[0].facility.prefecture}
                        {applicant.faxSheets[0].facility.city}) — 下記の A4 2 枚が施設に送信されます。
                      </p>
                      <iframe
                        src={`/api/fax-sheets/${applicant.faxSheets[0].id}/pdf`}
                        title="FAX 送信票 プレビュー"
                        className="h-[640px] w-full rounded-md border"
                      />
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-semibold">送信履歴一覧</h3>
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
                                <td className="py-1 pr-2">
                                  {s.createdAt.toISOString().slice(0, 10)}
                                </td>
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
                    </section>
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


function RankPill({ rank }: { rank: string }) {
  const palette: Record<string, string> = {
    S: "bg-emerald-100 text-emerald-900 border-emerald-200",
    A: "bg-sky-100 text-sky-900 border-sky-200",
    B: "bg-amber-100 text-amber-900 border-amber-200",
    C: "bg-orange-100 text-orange-900 border-orange-200",
    D: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full border px-1.5 text-[10px] font-bold",
        palette[rank] ?? palette.D,
      )}
    >
      {rank}
    </span>
  );
}

function rankBarColor(rank: string): string {
  switch (rank) {
    case "S":
      return "bg-emerald-500";
    case "A":
      return "bg-sky-500";
    case "B":
      return "bg-amber-500";
    case "C":
      return "bg-orange-500";
    default:
      return "bg-zinc-400";
  }
}
