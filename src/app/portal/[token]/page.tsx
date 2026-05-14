import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TsumugiLogo } from "@/components/brand/logo";
import { prisma } from "@/lib/db";
import { verifyPortalTokenWithDb } from "@/lib/portal/token";

export const metadata = { title: "施設ポータル | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function FacilityPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = await verifyPortalTokenWithDb(token);
  if (!verified.ok) {
    // 仕様: 不正なトークンは 404 にする (情報漏洩を避ける)
    notFound();
  }

  const facilityId = verified.facilityId;
  const [facility, faxSheets, jobOrders, invoices] = await Promise.all([
    prisma.facility.findUnique({
      where: { id: facilityId },
      select: { id: true, name: true, prefecture: true, city: true, address: true },
    }),
    prisma.faxSheet.findMany({
      where: { facilityId, status: "SENT" },
      orderBy: { sentAt: "desc" },
      take: 50,
      include: {
        applicant: {
          select: { lastName: true, firstName: true, status: true, qualifications: true },
        },
        reaction: true,
      },
    }),
    prisma.jobOrder.findMany({
      where: { facilityId, status: { in: ["OPEN", "HOLD"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.invoice.findMany({
      where: { facilityId, status: { in: ["ISSUED", "OVERDUE", "PAID"] } },
      orderBy: { issuedAt: "desc" },
      take: 20,
    }),
  ]);
  if (!facility) notFound();

  const pending = faxSheets.filter((f) => !f.reaction).length;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <TsumugiLogo withWordmark wordmarkClassName="text-sm" />
            <span className="text-xs text-muted-foreground">施設ポータル</span>
          </div>
          <Badge variant="muted" className="text-[10px]">
            認証なし / トークン専用
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {facility.name} 様 専用ポータル
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {facility.prefecture} {facility.city} {facility.address}
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            このページは弊社が発行したリンクからのみアクセスできます。お送りした FAX に対する
            反応 (興味あり / 見送り) や、貴施設からお預かりしている案件・請求書をご確認いただけます。
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              当社からお送りした人材プロフィール ({faxSheets.length} 件 / 未反応 {pending} 件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {faxSheets.length === 0 ? (
              <p className="text-sm text-muted-foreground">送信履歴はありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>送信日</TableHead>
                    <TableHead>求職者 (匿名表記)</TableHead>
                    <TableHead>主な資格</TableHead>
                    <TableHead>反応</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faxSheets.map((sheet) => {
                    const initials = `${sheet.applicant.lastName.slice(0, 1)}.${sheet.applicant.firstName.slice(0, 1)}.`;
                    const quals = sheet.applicant.qualifications.map((q) => q.name).join(" / ") || "—";
                    return (
                      <TableRow key={sheet.id}>
                        <TableCell className="text-xs">
                          {sheet.sentAt ? sheet.sentAt.toISOString().slice(0, 10) : "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{initials}</span>{" "}
                          <Badge variant="outline" className="text-[10px]">
                            {sheet.applicant.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{quals}</TableCell>
                        <TableCell>
                          {sheet.reaction ? (
                            <Badge variant={sheet.reaction.interested ? "success" : "muted"}>
                              {sheet.reaction.interested ? "興味あり" : "見送り"}
                            </Badge>
                          ) : (
                            <Badge variant="warning">未反応</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {!sheet.reaction && (
                            <a
                              href={`/portal/${token}/reactions/${sheet.id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              反応を送る
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              お預かり中の求人案件 ({jobOrders.length} 件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                現在お預かりしている案件はありません。条件の更新や追加は担当者までご連絡ください。
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {jobOrders.map((j) => (
                  <li key={j.id} className="rounded border bg-background p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{j.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {j.position}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {j.employmentType}
                      </Badge>
                      {j.urgency !== "NORMAL" && (
                        <Badge variant={j.urgency === "CRITICAL" ? "danger" : "warning"}>
                          {j.urgency === "CRITICAL" ? "最優先" : "急募"}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {j.monthlyWageMin
                        ? `月給 ${j.monthlyWageMin.toLocaleString()}〜${(j.monthlyWageMax ?? 0).toLocaleString()} 円`
                        : j.hourlyWageMin
                          ? `時給 ${j.hourlyWageMin}〜${j.hourlyWageMax ?? "-"} 円`
                          : "給与応相談"}{" "}
                      / 採用人数 {j.headcount} 名
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              発行済の請求書 ({invoices.length} 件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">請求書はまだ発行されていません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>請求番号</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>支払期日</TableHead>
                    <TableHead>合計</TableHead>
                    <TableHead>状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-xs">
                        {inv.issuedAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {inv.dueAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">
                        ¥{Number(inv.totalAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "PAID"
                              ? "success"
                              : inv.status === "OVERDUE"
                                ? "danger"
                                : "outline"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ご質問・ご要望は担当者までご連絡ください。本リンクは{" "}
          {verified.ok ? new Date(verified.facility ? Date.now() : Date.now()).toISOString().slice(0, 10) : ""}{" "}
          時点で有効です。
        </p>
      </main>
    </div>
  );
}
