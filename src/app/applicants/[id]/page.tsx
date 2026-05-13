import { redirect } from "next/navigation";

// 旧パス。Phase 1-6 で /admin/applicants/[id] に統合した。
export default async function LegacyApplicantDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/applicants/${id}`);
}
