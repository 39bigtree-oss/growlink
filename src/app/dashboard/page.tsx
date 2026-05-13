import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "ダッシュボード | グロウリンク",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-8 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">管理ダッシュボード</h1>
          <p className="text-sm text-muted-foreground">
            ログイン中: {session.user.email} ({session.user.role ?? "VIEWER"})
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            ログアウト
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Phase 1-1 セットアップ完了</CardTitle>
          <CardDescription>
            Next.js + Prisma + Auth.js の雛形が動作しています。
            次タスク (1-2 以降) で申込フォーム・診断ロジック・FAX 生成を実装していきます。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>申込一覧 — Phase 1-6 で実装</li>
            <li>AI 適職診断 — Phase 1-4 / 1-5 で実装</li>
            <li>FAX 送信票テンプレ — Phase 1-7 で実装</li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
