import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";
import { loadSkillSheetContent } from "@/lib/skill-sheet/processResume";

import { SkillSheetForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata = { title: "スキルシート | グロウリンク" };

export default async function SkillSheetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await prisma.skillSheetToken.findUnique({
    where: { token },
    include: {
      applicant: {
        select: {
          id: true,
          lastName: true,
          firstName: true,
          language: true,
          skillSheet: {
            select: { submittedAt: true },
          },
        },
      },
    },
  });
  if (!row) notFound();

  const now = new Date();
  const expired = row.expiresAt.getTime() < now.getTime();
  const revoked = !!row.revokedAt;
  const submitted = !!row.applicant.skillSheet?.submittedAt;
  const locale = resolveLocale(row.applicant.language ?? "ja");
  const messages = getMessages(locale) as { skillSheet: Record<string, string> };

  if (expired || revoked) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-4 text-2xl font-semibold">{messages.skillSheet.pageTitle}</h1>
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {messages.skillSheet.expired}
        </p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-4 text-2xl font-semibold">{messages.skillSheet.pageTitle}</h1>
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {messages.skillSheet.alreadySubmitted}
        </p>
      </main>
    );
  }

  const initial = await loadSkillSheetContent(row.applicant.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SkillSheetForm
        token={token}
        applicantName={`${row.applicant.lastName} ${row.applicant.firstName}`}
        locale={locale}
        initial={initial}
      />
    </main>
  );
}
