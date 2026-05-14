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
import { requireAdminSession } from "@/lib/auth/session";
import { listMyNumbers } from "@/lib/repositories/my-number";

export const metadata = { title: "マイナンバー | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function MyNumbersListPage() {
  await requireAdminSession("my-number:read");
  const records = await listMyNumbers({ take: 200 });

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">マイナンバー (特定個人情報)</h1>
        <p className="text-sm text-muted-foreground">
          源泉徴収・社会保険・雇用保険のため預かったマイナンバー。閲覧には必ず理由が必要です。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">登録済 ({records.length} 件)</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState title="マイナンバーは未登録です" description="求職者詳細から「マイナンバー登録」で追加できます (v1.5 では seed 経由)。" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>求職者</TableHead>
                  <TableHead>用途</TableHead>
                  <TableHead>暗号化日時</TableHead>
                  <TableHead>保管期限</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.applicant.lastName} {r.applicant.firstName}{" "}
                      <Badge variant="outline" className="ml-1">{r.applicant.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.purpose}</TableCell>
                    <TableCell className="text-sm">{r.encryptedAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-sm">{r.retentionUntil.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/my-numbers/${r.applicant.id}`}
                        className="text-sm text-primary underline-offset-2 hover:underline"
                      >
                        閲覧申請
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
