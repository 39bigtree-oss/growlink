import "server-only";

import type { NurtureTrigger } from "@prisma/client";

/**
 * ナーチャシナリオの「定義」 — テンプレート。
 *
 * インスタンス化時に NurtureSequence.steps に Json として保存される。
 * `runNurtureScan()` がこの定義を見て次ステップの実行 / 完了を判定する。
 *
 * 設計判断:
 *   - kind: "WAIT" は次ステップ実行までの間隔だけ。EmailLog 等の副作用なし
 *   - kind: "EMAIL" は emailTemplate キーで src/lib/email/templates/ の関数を解決
 *   - kind: "STAFF_TODO" は AdminUI で "対応する" ボタンを出す TODO 化
 */

export type NurtureStepDefinition =
  | { kind: "WAIT"; waitDays: number; label: string }
  | {
      kind: "EMAIL";
      label: string;
      emailTemplate: "skill_sheet_reminder" | "fax_reaction_followup" | "interview_reminder";
    }
  | { kind: "STAFF_TODO"; label: string; todoMessage: string };

export type NurtureSequenceDefinition = {
  trigger: NurtureTrigger;
  name: string;
  description: string;
  steps: NurtureStepDefinition[];
};

/**
 * v1.8 同梱のシナリオ定義 5 種。
 */
export const SEQUENCE_DEFINITIONS: NurtureSequenceDefinition[] = [
  {
    trigger: "FAX_SENT_NO_REPLY",
    name: "FAX 未反応リマインド",
    description: "FAX 送信から 24 時間以内に反応が無ければ営業に TODO を起こす",
    steps: [
      { kind: "WAIT", waitDays: 1, label: "24 時間待機" },
      {
        kind: "STAFF_TODO",
        label: "営業にリマインド TODO",
        todoMessage: "FAX 送信から 24h 経過。施設に電話 / 反応ポータルリンク再送付を検討。",
      },
    ],
  },
  {
    trigger: "SKILL_SHEET_INVITED_NO_SUBMIT",
    name: "スキルシート未提出催促",
    description: "招待から 7 日経って未提出ならリマインドメール + さらに 7 日で TODO 化",
    steps: [
      { kind: "WAIT", waitDays: 7, label: "7 日待機" },
      { kind: "EMAIL", label: "リマインドメール送信", emailTemplate: "skill_sheet_reminder" },
      { kind: "WAIT", waitDays: 7, label: "もう 7 日待機" },
      {
        kind: "STAFF_TODO",
        label: "営業にフォロー TODO",
        todoMessage: "スキルシート招待から 14 日経過。直接連絡を検討。",
      },
    ],
  },
  {
    trigger: "INTEREST_RECEIVED",
    name: "施設から興味あり → 24h 内資料送付",
    description: "FAX 反応で興味ありを受領 → 24 時間以内に追加資料を送付するスタッフ TODO",
    steps: [
      {
        kind: "STAFF_TODO",
        label: "24h 以内に追加情報を送付",
        todoMessage: "施設から「興味あり」反応あり。求職者プロフィール詳細 / 面談候補日を送付してください。",
      },
    ],
  },
  {
    trigger: "PLACEMENT_1MONTH",
    name: "入社 1 ヶ月フォロー",
    description: "入社から 1 ヶ月で求職者へ「お元気ですか」メール",
    steps: [
      { kind: "WAIT", waitDays: 30, label: "入社 30 日待機" },
      { kind: "EMAIL", label: "1 ヶ月フォローメール", emailTemplate: "fax_reaction_followup" },
    ],
  },
  {
    trigger: "PLACEMENT_3MONTH",
    name: "入社 3 ヶ月フォロー",
    description: "入社から 3 ヶ月で求職者・施設の双方に近況確認",
    steps: [
      { kind: "WAIT", waitDays: 90, label: "入社 90 日待機" },
      {
        kind: "STAFF_TODO",
        label: "3 ヶ月面談を実施",
        todoMessage: "求職者・施設双方に近況を確認。退職リスクの兆候を聞き取る。",
      },
    ],
  },
];

export function findDefinition(trigger: NurtureTrigger): NurtureSequenceDefinition | undefined {
  return SEQUENCE_DEFINITIONS.find((d) => d.trigger === trigger);
}

/**
 * 次ステップを実行する時刻を計算 (純粋関数)。
 * - WAIT は waitDays 日後
 * - EMAIL / STAFF_TODO は即時実行 (次の scan 時)
 */
export function nextRunAtFor(
  step: NurtureStepDefinition,
  from: Date = new Date(),
): Date {
  if (step.kind === "WAIT") {
    return new Date(from.getTime() + step.waitDays * 24 * 60 * 60 * 1000);
  }
  // 即時実行
  return from;
}
