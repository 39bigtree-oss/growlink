import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

import { SimulateClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata = { title: "面接シミュレータ | グロウリンク" };

export default async function SimulatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireAdminSession("interviews:read");
  const canWrite = hasCapability(staff.role, "interviews:write");
  const { id } = await params;

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      applicant: {
        select: { id: true, lastName: true, firstName: true, language: true },
      },
      turns: { orderBy: { turnIndex: "asc" } },
    },
  });
  if (!interview) notFound();

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">面接シミュレータ</h1>
        <p className="text-sm text-muted-foreground">
          {interview.applicant.lastName} {interview.applicant.firstName} さん /
          ステータス: {interview.status} / 言語: {interview.language}
        </p>
      </header>

      <SimulateClient
        interviewId={interview.id}
        applicantId={interview.applicant.id}
        started={interview.status === "in_progress"}
        completed={interview.status === "completed"}
        initialTurns={interview.turns.map((t) => ({
          turnIndex: t.turnIndex,
          role: t.role as "ai" | "applicant",
          text: t.text,
        }))}
        canWrite={canWrite}
      />
    </div>
  );
}
