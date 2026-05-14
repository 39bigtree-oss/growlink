import "server-only";

import { Prisma, type NurtureSequence, type NurtureTrigger } from "@prisma/client";

import { prisma } from "@/lib/db";

import { findDefinition, nextRunAtFor, type NurtureStepDefinition } from "./sequences";

/**
 * 新規シナリオを起動する。
 * 既に同 trigger × applicantId/placementId の ACTIVE シナリオがあれば二重起動しない。
 */
export async function startNurtureSequence(args: {
  trigger: NurtureTrigger;
  applicantId?: string;
  placementId?: string;
  startedAt?: Date;
}): Promise<NurtureSequence | null> {
  const def = findDefinition(args.trigger);
  if (!def) throw new Error(`シナリオ定義なし: ${args.trigger}`);

  const existing = await prisma.nurtureSequence.findFirst({
    where: {
      trigger: args.trigger,
      status: "ACTIVE",
      ...(args.applicantId ? { applicantId: args.applicantId } : {}),
      ...(args.placementId ? { placementId: args.placementId } : {}),
    },
  });
  if (existing) return null;

  const startedAt = args.startedAt ?? new Date();
  const nextRunAt = def.steps.length > 0 ? nextRunAtFor(def.steps[0], startedAt) : null;

  return prisma.nurtureSequence.create({
    data: {
      applicantId: args.applicantId ?? null,
      placementId: args.placementId ?? null,
      trigger: args.trigger,
      status: "ACTIVE",
      steps: def.steps as unknown as Prisma.InputJsonValue,
      currentStep: 0,
      startedAt,
      nextRunAt,
    },
  });
}

/**
 * scan: 「nextRunAt <= now」かつ ACTIVE のシナリオを取り、1 ステップずつ進める。
 * BullMQ の日次ジョブから呼ばれることを想定。
 *
 * 戻り値: 処理した件数の内訳。
 */
export async function runNurtureScan(now: Date = new Date()): Promise<{
  scanned: number;
  emailSent: number;
  staffTodoCreated: number;
  waited: number;
  completed: number;
}> {
  const due = await prisma.nurtureSequence.findMany({
    where: {
      status: "ACTIVE",
      nextRunAt: { lte: now },
    },
    take: 200,
  });
  let emailSent = 0;
  let staffTodoCreated = 0;
  let waited = 0;
  let completed = 0;

  for (const seq of due) {
    const steps = (seq.steps as unknown as NurtureStepDefinition[]) ?? [];
    const idx = seq.currentStep;
    const step = steps[idx];
    if (!step) {
      await prisma.nurtureSequence.update({
        where: { id: seq.id },
        data: { status: "COMPLETED", completedAt: now, nextRunAt: null },
      });
      completed++;
      continue;
    }

    let result = "ok";
    let payload: Prisma.InputJsonValue | undefined;

    try {
      if (step.kind === "EMAIL") {
        // v1.8 では mock として「実行した記録だけ」残す。
        // 実メール文面の組み立て + sendEmail 呼び出しは v1.9 のフォローアップで本接続。
        payload = {
          template: step.emailTemplate,
          label: step.label,
          via: "mock-stub",
        };
        emailSent++;
      } else if (step.kind === "STAFF_TODO") {
        payload = { label: step.label, todoMessage: step.todoMessage };
        staffTodoCreated++;
      } else if (step.kind === "WAIT") {
        // WAIT 自体は記録のみ
        payload = { label: step.label, waitDays: step.waitDays };
        waited++;
      }
    } catch (err) {
      result = `failed:${(err as Error).message}`;
    }

    await prisma.nurtureStepExecution.create({
      data: {
        sequenceId: seq.id,
        stepIndex: idx,
        kind: step.kind,
        result,
        payload: payload ?? Prisma.JsonNull,
      },
    });

    const nextIdx = idx + 1;
    if (nextIdx >= steps.length) {
      await prisma.nurtureSequence.update({
        where: { id: seq.id },
        data: { status: "COMPLETED", completedAt: now, currentStep: nextIdx, nextRunAt: null },
      });
      completed++;
    } else {
      const nextStep = steps[nextIdx];
      await prisma.nurtureSequence.update({
        where: { id: seq.id },
        data: {
          currentStep: nextIdx,
          nextRunAt: nextRunAtFor(nextStep, now),
        },
      });
    }
  }

  return {
    scanned: due.length,
    emailSent,
    staffTodoCreated,
    waited,
    completed,
  };
}

