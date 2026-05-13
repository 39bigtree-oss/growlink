import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { verifyReactionToken } from "@/lib/fax/reaction-token";

import { FeedbackForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "返信フォーム | グロウリンク" };

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const id = verifyReactionToken(token);
  if (!id) notFound();
  const sheet = await prisma.faxSheet.findUnique({
    where: { id },
    include: {
      facility: { select: { name: true, prefecture: true, city: true } },
      reaction: { select: { interested: true, comment: true, receivedAt: true } },
    },
  });
  if (!sheet) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">返信フォーム</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {sheet.facility.name} 御中。当社からの FAX 案内に対する返信フォームです。回答は担当者に通知されます。
      </p>
      <FeedbackForm token={token} initial={sheet.reaction ?? null} />
    </main>
  );
}
