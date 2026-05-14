import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { verifyPortalTokenWithDb } from "@/lib/portal/token";

import { PortalReactionForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "ご反応の登録 | Tsumugi 施設ポータル" };

export default async function PortalReactionPage({
  params,
}: {
  params: Promise<{ token: string; sheetId: string }>;
}) {
  const { token, sheetId } = await params;
  const verified = await verifyPortalTokenWithDb(token);
  if (!verified.ok) notFound();

  const sheet = await prisma.faxSheet.findFirst({
    where: { id: sheetId, facilityId: verified.facilityId },
    include: {
      applicant: { select: { lastName: true, firstName: true, qualifications: true } },
      reaction: true,
    },
  });
  if (!sheet) notFound();

  const initials = `${sheet.applicant.lastName.slice(0, 1)}.${sheet.applicant.firstName.slice(0, 1)}.`;

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <Link
        href={`/portal/${token}`}
        className="text-sm text-primary underline-offset-2 hover:underline"
      >
        ← ポータル トップへ
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="font-mono">{initials}</span> さん へのご反応
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {sheet.applicant.qualifications.map((q) => (
              <Badge key={q.name} variant="outline">{q.name}</Badge>
            ))}
          </div>
          {sheet.reaction ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              すでにご反応をいただいています:{" "}
              <Badge variant={sheet.reaction.interested ? "success" : "muted"}>
                {sheet.reaction.interested ? "興味あり" : "見送り"}
              </Badge>
              {sheet.reaction.comment ? (
                <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  コメント: {sheet.reaction.comment}
                </p>
              ) : null}
            </div>
          ) : (
            <PortalReactionForm token={token} sheetId={sheet.id} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
