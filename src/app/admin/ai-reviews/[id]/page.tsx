import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findAiReview, isPublishable } from "@/lib/ai/review";
import { requireAdminSession } from "@/lib/auth/session";

import { ReviewDecisionForm } from "./_decision-form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "未承認",
  APPROVED: "承認",
  EDITED: "編集後承認",
  REJECTED: "却下",
};

const KIND_LABEL: Record<string, string> = {
  DIAGNOSIS: "適職診断",
  FAX_COVER: "FAX 送信票",
  EMAIL_DRAFT: "メール文面",
  INTERVIEW_SUMMARY: "面接サマリ",
};

type BiasFinding = {
  category: string;
  severity: "ok" | "warn" | "block";
  matchedText: string;
  reason: string;
};

type BiasEval = {
  overall: "ok" | "warn" | "block";
  findings: BiasFinding[];
};

export default async function AiReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession();
  const review = await findAiReview(id);
  if (!review) notFound();

  const bias = (review.biasEval as unknown as BiasEval | null) ?? null;
  const publishable = isPublishable(review.status);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {KIND_LABEL[review.kind] ?? review.kind} レビュー
        </h1>
        <Badge variant={publishable ? "success" : review.status === "REJECTED" ? "danger" : "warning"}>
          {STATUS_LABEL[review.status]}
        </Badge>
        {bias && bias.overall !== "ok" ? (
          <Badge variant={bias.overall === "block" ? "danger" : "warning"}>
            bias: {bias.overall}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/admin/ai-reviews" className="hover:underline">AI 出力レビュー</Link>
        {review.applicant ? (
          <>
            {" / "}
            <Link
              href={`/admin/applicants/${review.applicant.id}`}
              className="hover:underline"
            >
              {review.applicant.lastName} {review.applicant.firstName}
            </Link>
          </>
        ) : null}
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-xs">
            <div className="text-muted-foreground">確信度</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {review.confidence != null ? `${(review.confidence * 100).toFixed(0)}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-xs">
            <div className="text-muted-foreground">bias 検査</div>
            <div className="mt-1 text-xl font-semibold capitalize">{bias?.overall ?? "—"}</div>
            <div className="text-muted-foreground">findings: {bias?.findings.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-xs">
            <div className="text-muted-foreground">レビュー者</div>
            <div className="mt-1 text-sm font-semibold">
              {review.reviewerStaff
                ? `${review.reviewerStaff.name} (${review.reviewerStaff.role})`
                : "—"}
            </div>
            <div className="text-muted-foreground">
              {review.reviewedAt
                ? review.reviewedAt.toISOString().slice(0, 16).replace("T", " ")
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {bias && bias.findings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">bias 検出 ({bias.findings.length} 件)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {bias.findings.map((f, i) => (
                <li
                  key={i}
                  className={`rounded border p-2 ${
                    f.severity === "block"
                      ? "border-destructive bg-destructive/5"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={f.severity === "block" ? "danger" : "warning"}>
                      {f.severity}
                    </Badge>
                    <Badge variant="outline">{f.category}</Badge>
                  </div>
                  <div className="mt-1 text-xs font-mono">「{f.matchedText}」</div>
                  <div className="mt-1 text-xs text-muted-foreground">{f.reason}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI 出力 (オリジナル)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded bg-muted/30 p-3 text-xs">
            {review.aiOutput}
          </pre>
        </CardContent>
      </Card>

      {review.finalOutput && review.finalOutput !== review.aiOutput ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">編集後 (公開版)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded bg-emerald-50 p-3 text-xs">
              {review.finalOutput}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {review.reviewNote ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">レビューノート</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{review.reviewNote}</p>
          </CardContent>
        </Card>
      ) : null}

      {review.status === "PENDING" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">決定</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewDecisionForm reviewId={review.id} aiOutput={review.aiOutput} />
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="outline">
        <Link href="/admin/ai-reviews">一覧に戻る</Link>
      </Button>
    </div>
  );
}
