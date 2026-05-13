import { redirect } from "next/navigation";

// 旧パス。Phase 1-6 で /admin/* に統合した。
export default function LegacyDashboardRedirect() {
  redirect("/admin/dashboard");
}
