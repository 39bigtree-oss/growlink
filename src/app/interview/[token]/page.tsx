import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/get-messages";

import { InterviewClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 面接 | グロウリンク" };

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await prisma.interviewToken.findUnique({
    where: { token },
    include: {
      interview: {
        include: {
          applicant: {
            select: { id: true, lastName: true, firstName: true, language: true },
          },
          turns: { orderBy: { turnIndex: "asc" } },
        },
      },
    },
  });
  if (!row) notFound();

  const expired = row.expiresAt.getTime() < Date.now() || !!row.revokedAt;
  const completed = row.interview.status === "completed";
  const locale = resolveLocale(row.interview.applicant.language ?? "ja");
  const messages = getMessages(locale) as { interview: Record<string, string> };

  if (expired) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-4 text-2xl font-semibold">{messages.interview.pageTitle}</h1>
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {messages.interview.expired}
        </p>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-4 text-2xl font-semibold">{messages.interview.pageTitle}</h1>
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {messages.interview.alreadyCompleted}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <InterviewClient
        token={token}
        applicantName={`${row.interview.applicant.lastName} ${row.interview.applicant.firstName}`}
        locale={locale}
        initialTurns={row.interview.turns.map((t) => ({
          turnIndex: t.turnIndex,
          role: t.role as "ai" | "applicant",
          text: t.text,
        }))}
        started={row.interview.status === "in_progress"}
      />
    </main>
  );
}
