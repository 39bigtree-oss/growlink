import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";

export const metadata = { title: "営業フロー | グロウリンク" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * 営業フロー画面 (Phase 4):
 *   - 「営業フェーズ」の求職者一覧 (status = SALES_READY / IN_INTRODUCTION) を表示
 *   - 各求職者のトップ業態を表示、ワンクリックで /admin/fax-sheets/new に進む導線
 *   - 興味あり反応のリストも下部に表示し、リードを優先処理できるよう
 */
export default async function SalesHubPage() {
  const staff = await requireAdminSession("applicants:read");
  const canFax = hasCapability(staff.role, "fax:create");

  const [ready, introduction, interestedReactions] = await Promise.all([
    prisma.applicant.findMany({
      where: { status: "SALES_READY", deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        diagnoses: { orderBy: { score: "desc" }, take: 1 },
        qualifications: true,
      },
    }),
    prisma.applicant.findMany({
      where: { status: "IN_INTRODUCTION", deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        diagnoses: { orderBy: { score: "desc" }, take: 1 },
        qualifications: true,
      },
    }),
    prisma.faxReaction.findMany({
      where: { interested: true },
      orderBy: { receivedAt: "desc" },
      take: 20,
      include: {
        faxSheet: {
          include: {
            applicant: { select: { id: true, lastName: true, firstName: true } },
          },
        },
        facility: { select: { name: true, prefecture: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">営業フロー</h1>
        <p className="text-sm text-muted-foreground">
          営業フェーズの求職者リストと、施設からの興味あり反応です。
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">紹介待ち (SALES_READY) — {ready.length} 名</CardTitle>
          <CardDescription>
            スキルシート + AI 面接が完了し、施設紹介の準備が整った求職者です。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ApplicantTable applicants={ready} canFax={canFax} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">紹介中 (IN_INTRODUCTION) — {introduction.length} 名</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ApplicantTable applicants={introduction} canFax={canFax} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">最近の「興味あり」反応 — 直近 20 件</CardTitle>
          <CardDescription>施設から返信が「興味あり」となったリードを優先処理しましょう。</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>施設</TableHead>
                <TableHead>候補者</TableHead>
                <TableHead>受信日時</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interestedReactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    まだ興味ありの反応はありません。
                  </TableCell>
                </TableRow>
              ) : (
                interestedReactions.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.facility.name}</div>
                      <div className="text-xs text-muted-foreground">{r.facility.prefecture}</div>
                    </TableCell>
                    <TableCell>
                      {r.faxSheet.applicant.lastName} {r.faxSheet.applicant.firstName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.receivedAt.toISOString().slice(0, 16)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/applicants/${r.faxSheet.applicant.id}`}>申込詳細</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type ApplicantRow = {
  id: string;
  lastName: string;
  firstName: string;
  desiredCategories: string[];
  diagnoses: Array<{ category: string; rank: string; score: number }>;
  qualifications: Array<{ name: string }>;
};

function ApplicantTable({
  applicants,
  canFax,
}: {
  applicants: ApplicantRow[];
  canFax: boolean;
}) {
  if (applicants.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">該当者はいません。</div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>氏名</TableHead>
          <TableHead>保有資格</TableHead>
          <TableHead>適性トップ</TableHead>
          <TableHead className="text-right">アクション</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applicants.map((a) => {
          const top = a.diagnoses[0];
          return (
            <TableRow key={a.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/applicants/${a.id}`} className="hover:underline">
                  {a.lastName} {a.firstName}
                </Link>
              </TableCell>
              <TableCell className="text-xs">
                {a.qualifications.length > 0
                  ? a.qualifications.map((q) => q.name).join(", ")
                  : "—"}
              </TableCell>
              <TableCell className="text-xs">
                {top ? (
                  <>
                    <Badge variant="muted">{CATEGORY_LABELS[top.category] ?? top.category}</Badge>
                    <span className="ml-2">
                      ランク {top.rank} / {top.score} 点
                    </span>
                  </>
                ) : (
                  "未診断"
                )}
              </TableCell>
              <TableCell className="space-x-2 text-right">
                {canFax && (
                  <Button asChild size="sm">
                    <Link href={`/admin/fax-sheets/new?applicantId=${a.id}`}>FAX 送信票作成</Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
