import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge ランタイムで動作するため、auth.ts ではなく auth.config.ts を import する。
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
