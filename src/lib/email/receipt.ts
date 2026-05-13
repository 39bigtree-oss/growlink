import "server-only";

import { sendEmail } from "./client";
import { buildApplicantReceiptEmail } from "./templates/applicant-receipt";
import { buildStaffNotificationEmail } from "./templates/staff-notification";

export type ReceiptEmailInput = {
  applicantId: string;
  email: string;
  lastName: string;
  firstName: string;
  language?: string | null;
  wantsDiagnosis: boolean;
};

/**
 * Phase 1-3 から維持しているエントリポイント。Phase 2 で内部実装をテンプレ + provider 経由に差し替えた。
 * 旧呼び出し元 (`/api/applicants/route.ts`) は変更なしで動く。
 */
export async function sendReceiptEmail(input: ReceiptEmailInput): Promise<void> {
  await sendEmail(
    buildApplicantReceiptEmail({
      applicantId: input.applicantId,
      to: input.email,
      lastName: input.lastName,
      firstName: input.firstName,
      locale: input.language ?? "ja",
      wantsDiagnosis: input.wantsDiagnosis,
    }),
  );
}

export async function sendStaffNotificationEmail(input: { applicantId: string }): Promise<void> {
  await sendEmail(buildStaffNotificationEmail({ applicantId: input.applicantId }));
}
