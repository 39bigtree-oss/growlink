"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { hasCapability } from "@/lib/auth/rbac";
import { facilityFormSchema } from "@/lib/schemas/facility";
import {
  createFacility,
  deleteFacility,
  updateFacility,
} from "@/lib/repositories/facility";
import { recordAuditLog } from "@/lib/repositories/audit-log";

export type FacilityActionState = {
  ok: boolean;
  message?: string;
};

async function ensureWrite(): Promise<{ staffId: string } | FacilityActionState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "ログインが必要です" };
  if (!hasCapability(session.user.role, "facilities:write")) {
    return { ok: false, message: "施設マスタの編集権限がありません" };
  }
  return { staffId: session.user.id };
}

function readFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    prefecture: String(formData.get("prefecture") ?? ""),
    city: String(formData.get("city") ?? ""),
    address: String(formData.get("address") ?? ""),
    fax: String(formData.get("fax") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    isFaxPublic: formData.get("isFaxPublic") === "on",
    notes: String(formData.get("notes") ?? "") || undefined,
  };
}

export async function createFacilityAction(
  _prev: FacilityActionState,
  formData: FormData,
): Promise<FacilityActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const parsed = facilityFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }
  const facility = await createFacility(parsed.data);
  await recordAuditLog({
    staffId: guard.staffId,
    action: "facility.create",
    target: facility.id,
    payload: { name: facility.name },
  });
  revalidatePath("/admin/facilities");
  redirect("/admin/facilities");
}

export async function updateFacilityAction(
  id: string,
  _prev: FacilityActionState,
  formData: FormData,
): Promise<FacilityActionState> {
  const guard = await ensureWrite();
  if ("ok" in guard) return guard;
  const parsed = facilityFormSchema.safeParse(readFormData(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues.map((i) => i.message).join(" / ") };
  }
  await updateFacility(id, parsed.data);
  await recordAuditLog({
    staffId: guard.staffId,
    action: "facility.update",
    target: id,
    payload: { name: parsed.data.name },
  });
  revalidatePath("/admin/facilities");
  redirect("/admin/facilities");
}

export async function deleteFacilityAction(id: string): Promise<void> {
  const guard = await ensureWrite();
  if ("ok" in guard) {
    throw new Error(guard.message ?? "forbidden");
  }
  await deleteFacility(id);
  await recordAuditLog({
    staffId: guard.staffId,
    action: "facility.delete",
    target: id,
  });
  revalidatePath("/admin/facilities");
}
