import { ApplicantStatus } from "@prisma/client";

/**
 * 申込ステータスの有限状態機械。
 * 各ステータスから許される次状態を列挙する。`REJECTED` はいつでも遷移可能 (申込辞退・取消)。
 * `CONTRACTED` と `REJECTED` は終端状態。
 */
const TRANSITIONS: Record<ApplicantStatus, ApplicantStatus[]> = {
  RECEIVED: ["DIAGNOSED", "SKILL_SHEET_INPROGRESS", "REJECTED"],
  DIAGNOSED: ["SKILL_SHEET_INPROGRESS", "INTERVIEW_DONE", "REJECTED"],
  SKILL_SHEET_INPROGRESS: ["SKILL_SHEET_DONE", "REJECTED"],
  SKILL_SHEET_DONE: ["INTERVIEW_DONE", "SALES_READY", "REJECTED"],
  INTERVIEW_DONE: ["SALES_READY", "REJECTED"],
  SALES_READY: ["IN_INTRODUCTION", "REJECTED"],
  IN_INTRODUCTION: ["CONTRACTED", "REJECTED"],
  CONTRACTED: [],
  REJECTED: [],
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  RECEIVED: "受付",
  DIAGNOSED: "診断完了",
  SKILL_SHEET_INPROGRESS: "スキルシート作成中",
  SKILL_SHEET_DONE: "スキルシート完了",
  INTERVIEW_DONE: "面接完了",
  SALES_READY: "営業準備完了",
  IN_INTRODUCTION: "紹介中",
  CONTRACTED: "成約",
  REJECTED: "辞退",
};

export function nextStatusOptions(current: ApplicantStatus): ApplicantStatus[] {
  return TRANSITIONS[current] ?? [];
}

export function canTransition(from: ApplicantStatus, to: ApplicantStatus): boolean {
  if (from === to) return false;
  return nextStatusOptions(from).includes(to);
}

export function statusLabel(status: ApplicantStatus | string): string {
  return STATUS_LABEL[status as ApplicantStatus] ?? status;
}

export const ALL_STATUSES: ApplicantStatus[] = [
  "RECEIVED",
  "DIAGNOSED",
  "SKILL_SHEET_INPROGRESS",
  "SKILL_SHEET_DONE",
  "INTERVIEW_DONE",
  "SALES_READY",
  "IN_INTRODUCTION",
  "CONTRACTED",
  "REJECTED",
];
