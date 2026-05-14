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
import { requireAdminSession } from "@/lib/auth/session";
import { countAuditEvents, listAuditEvents } from "@/lib/repositories/audit-event";

import { VerifyChainPanel } from "./_verify-panel";

export const metadata = { title: "監査ログ | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entityType?: string }>;
}) {
  await requireAdminSession("audit:read");
  const sp = await searchParams;
  const [items, total] = await Promise.all([
    listAuditEvents({
      action: sp.action,
      entityType: sp.entityType,
      take: 200,
    }),
    countAuditEvents({ action: sp.action, entityType: sp.entityType }),
  ]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">監査ログ (AuditEvent)</h1>
        <p className="text-sm text-muted-foreground">
          すべての mutation を append-only でハッシュチェーン保存。改ざんは「整合性検証」ボタンで検出できます。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">チェーン整合性検証</CardTitle>
        </CardHeader>
        <CardContent>
          <VerifyChainPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            最新 {items.length} 件 (該当 {total} 件)
            {sp.action ? (
              <Badge variant="outline" className="ml-2">action: {sp.action}</Badge>
            ) : null}
            {sp.entityType ? (
              <Badge variant="outline" className="ml-2">entityType: {sp.entityType}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="監査イベントがまだありません" description="求人案件・契約・請求書を操作するとここに記録されます。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>操作者</TableHead>
                  <TableHead>action</TableHead>
                  <TableHead>entityType / id</TableHead>
                  <TableHead>hash (前 8 桁)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.hash}>
                    <TableCell className="font-mono text-xs">
                      {e.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.actor ? (
                        <>
                          {e.actor.name}{" "}
                          <span className="text-xs text-muted-foreground">({e.actor.role})</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {e.actorEmail ?? "system"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{e.entityType}</div>
                      {e.entityId ? <div className="text-muted-foreground">{e.entityId}</div> : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {e.prevHash.slice(0, 6)}… → {e.hash.slice(0, 6)}…
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
