import { redirect } from "next/navigation";

// 旧パス。Phase 1-6 で /admin/applicants に統合した。
export default function LegacyApplicantsRedirect() {
  redirect("/admin/applicants");
}
