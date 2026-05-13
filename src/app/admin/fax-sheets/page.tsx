import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { SendFaxButton } from "./_send-button";

export const metadata = { title: "FAX 送信票 | グロウリンク" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送信済み",
  FAILED: "失敗",
  QUEUED: "送信待ち",
};

function statusVariant(status: string): "muted" | "success" | "danger" | "warning" {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "danger";
  if (status === "QUEUED") return "warning";
  return "muted";
}

export default async function FaxSheetsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireAdminSession("fax:read");
  const canCreate = hasCapability(staff.role, "fax:create");
  const canSend = hasCapability(staff.role, "fax:send");
  const sp = await searchParams;
  const statusFilter = typeof sp.status === "string" ? sp.status : undefined;

  const sheets = await prisma.faxSheet.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      applicant: { select: { lastName: true, firstName: true } },
      facility: { select: { name: true, prefecture: true, city: true, fax: true } },
      reaction: { select: { interested: true } },
    },
  });

  const statusValues = ["DRAFT", "QUEUED", "SENT", "FAILED"];

  return (
    <div className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">FAX 送信票</h1>
          <p className="text-sm text-muted-foreground">{sheets.length} 件 (最大 50 件表示)</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/admin/fax-sheets/new">新規作成 / 一括生成</Link>
          </Button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/fax-sheets"
          className={`rounded border px-3 py-1 text-xs ${statusFilter ? "border-border text-muted-foreground" : "border-primary bg-primary text-primary-foreground"}`}
        >
          全件
        </Link>
        {statusValues.map((s) => (
          <Link
            key={s}
            href={`/admin/fax-sheets?status=${s}`}
            className={`rounded border px-3 py-1 text-xs ${statusFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
          >
            {STATUS_LABEL[s] ?? s}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">送信票一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>求職者</TableHead>
                <TableHead>送付先施設</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>反応</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead>送信日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    まだ送信票はありません。
                  </TableCell>
                </TableRow>
              ) : (
                sheets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.applicant.lastName} {s.applicant.firstName}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{s.facility.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.facility.prefecture}
                        {s.facility.city} / FAX {s.facility.fax ?? "未登録"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.reaction
                        ? s.reaction.interested
                          ? "興味あり"
                          : "辞退"
                        : "未返信"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.createdAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.sentAt ? s.sentAt.toISOString().slice(0, 10) : "─"}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={`/api/fax-sheets/${s.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      </Button>
                      <SendFaxButton
                        faxSheetId={s.id}
                        facilityName={s.facility.name}
                        alreadySent={s.status === "SENT"}
                        canSend={canSend}
                      />
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
