import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { countAiReviews, listAiReviews } from "@/lib/ai/review";
import { requireAdminSession } from "@/lib/auth/session";

export const metadata = { title: "AI 出力レビュー | Tsumugi" };
export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  PENDING: { label: "未承認", variant: "warning" as const },
  APPROVED: { label: "承認", variant: "success" as const },
  EDITED: { label: "編集後承認", variant: "success" as const },
  REJECTED: { label: "却下", variant: "danger" as const },
};

const KIND_LABEL: Record<string, string> = {
  DIAGNOSIS: "適職診断",
  FAX_COVER: "FAX 送信票",
  EMAIL_DRAFT: "メール文面",
  INTERVIEW_SUMMARY: "面接サマリ",
};

export default async function AiReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  await requireAdminSession();
  const sp = await searchParams;

  const [items, total, counts] = await Promise.all([
    listAiReviews({
      status: (sp.status as "PENDING") || undefined,
      kind: (sp.kind as "DIAGNOSIS") || undefined,
      take: 100,
    }),
    countAiReviews({
      status: (sp.status as "PENDING") || undefined,
      kind: (sp.kind as "DIAGNOSIS") || undefined,
    }),
    Promise.all([
      countAiReviews({ status: "PENDING" }),
      countAiReviews({ status: "APPROVED" }),
      countAiReviews({ status: "EDITED" }),
      countAiReviews({ status: "REJECTED" }),
    ]),
  ]);

  const [pending, approved, edited, rejected] = counts;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">AI 出力レビュー (Responsible AI)</h1>
        <p className="text-sm text-muted-foreground">
          AI が生成した出力は、人間レビューを経た上で初めて公開系処理 (FAX/メール送信等) に
          進めます。差別表現・誤情報のチェックレイヤとして機能します。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">未承認 (要対応)</div>
            <div className="text-2xl font-bold tabular-nums text-amber-700">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">承認</div>
            <div className="text-2xl font-bold tabular-nums">{approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">編集後承認</div>
            <div className="text-2xl font-bold tabular-nums">{edited}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground">却下</div>
            <div className="text-2xl font-bold tabular-nums">{rejected}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/admin/ai-reviews"
          className={`rounded border px-3 py-1 ${!sp.status ? "border-primary bg-primary text-primary-foreground" : ""}`}
        >
          すべて
        </Link>
        <Link
          href="/admin/ai-reviews?status=PENDING"
          className={`rounded border px-3 py-1 ${sp.status === "PENDING" ? "border-primary bg-primary text-primary-foreground" : ""}`}
        >
          未承認のみ
        </Link>
        <Link
          href="/admin/ai-reviews?status=APPROVED"
          className={`rounded border px-3 py-1 ${sp.status === "APPROVED" ? "border-primary bg-primary text-primary-foreground" : ""}`}
        >
          承認
        </Link>
        <Link
          href="/admin/ai-reviews?status=REJECTED"
          className={`rounded border px-3 py-1 ${sp.status === "REJECTED" ? "border-primary bg-primary text-primary-foreground" : ""}`}
        >
          却下
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">レビュー一覧 ({total} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState
              title="AI レビュー対象はまだありません"
              description="buildDiagnosis 等の AI 生成系を実行すると、ここに PENDING レコードが自動で追加されます。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>発生日</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>確信度</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {KIND_LABEL[r.kind] ?? r.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.applicant
                        ? `${r.applicant.lastName} ${r.applicant.firstName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.confidence != null
                        ? `${(r.confidence * 100).toFixed(0)}%`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[r.status].variant}>
                        {STATUS_BADGE[r.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/ai-reviews/${r.id}`}
                        className="text-sm text-primary underline-offset-2 hover:underline"
                      >
                        詳細
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
