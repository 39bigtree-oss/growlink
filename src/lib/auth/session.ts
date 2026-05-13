import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { hasCapability, type AdminCapability } from "./rbac";

export type SessionStaff = {
  id: string;
  email: string;
  name: string | null | undefined;
  role: string;
};

/**
 * /admin/* 配下のサーバコンポーネントから呼ぶ。未ログインなら /login へ、
 * 必要な権限を満たさなければ /admin/forbidden へリダイレクトする。
 */
export async function requireAdminSession(cap?: AdminCapability): Promise<SessionStaff> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const role = session.user.role ?? "VIEWER";
  if (cap && !hasCapability(role, cap)) {
    redirect("/admin/forbidden");
  }
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role,
  };
}
