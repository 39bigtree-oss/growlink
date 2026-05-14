import Link from "next/link";

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
import { prisma } from "@/lib/db";

import { IssuePortalTokenButton } from "./_issue-portal-token-button";

export async function FacilityPortalTokensPanel({ facilityId }: { facilityId: string }) {
  const tokens = await prisma.facilityPortalToken.findMany({
    where: { facilityId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">施設ポータルリンク</CardTitle>
        <IssuePortalTokenButton facilityId={facilityId} />
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          ログイン不要で施設が「自分宛 FAX の反応 / 案件 / 請求書」を閲覧できる HMAC 署名 URL。
          有効期限 90 日。1 施設に複数発行できます。
        </p>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">まだ発行されたリンクはありません。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>発行日</TableHead>
                <TableHead>有効期限</TableHead>
                <TableHead>アクセス数</TableHead>
                <TableHead>最終アクセス</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const expired = t.expiresAt.getTime() < Date.now();
                const portalUrl = `/portal/${t.token}`;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {t.createdAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.expiresAt.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs">{t.accessCount}</TableCell>
                    <TableCell className="text-xs">
                      {t.lastSeenAt ? t.lastSeenAt.toISOString().slice(0, 16).replace("T", " ") : "—"}
                    </TableCell>
                    <TableCell>
                      {t.revokedAt ? (
                        <Badge variant="muted">取消</Badge>
                      ) : expired ? (
                        <Badge variant="muted">期限切れ</Badge>
                      ) : (
                        <Badge variant="success">有効</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={portalUrl}
                        target="_blank"
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        ポータルを開く
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
