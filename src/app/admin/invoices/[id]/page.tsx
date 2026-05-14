import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasCapability } from "@/lib/auth/rbac";
import { requireAdminSession } from "@/lib/auth/session";
import { findInvoiceById } from "@/lib/repositories/invoice";

import { MarkPaidButton } from "./_mark-paid-button";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await requireAdminSession("invoices:read");
  const canWrite = hasCapability(staff.role, "invoices:write");
  const inv = await findInvoiceById(id);
  if (!inv) notFound();

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{inv.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/invoices" className="hover:underline">請求書</Link> / {inv.facility.name}
          </p>
        </div>
        <Badge variant={inv.status === "PAID" ? "default" : inv.status === "OVERDUE" ? "danger" : "outline"}>
          {inv.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">請求情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">発行日</div>
              <div>{inv.issuedAt.toISOString().slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">支払期日</div>
              <div>{inv.dueAt.toISOString().slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">入金日</div>
              <div>{inv.paidAt ? inv.paidAt.toISOString().slice(0, 10) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">外部 ID</div>
              <div className="font-mono text-xs">{inv.externalId ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">小計</div>
              <div>¥{Number(inv.amount).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">消費税</div>
              <div>¥{Number(inv.tax).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">合計</div>
              <div className="text-base font-semibold">¥{Number(inv.totalAmount).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">紐づく Placement</div>
              <div>
                {inv.placement ? (
                  <Link href={`/admin/placements/${inv.placement.id}`} className="text-primary hover:underline">
                    {inv.placement.applicant.lastName} {inv.placement.applicant.firstName}
                  </Link>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canWrite && inv.status !== "PAID" && inv.status !== "VOID" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">操作</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkPaidButton id={inv.id} />
          </CardContent>
        </Card>
      ) : null}

      <Button asChild variant="outline">
        <Link href="/admin/invoices">一覧に戻る</Link>
      </Button>
    </div>
  );
}
