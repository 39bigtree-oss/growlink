import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";

export const metadata = { title: "設定 | グロウリンク" };

export default async function SettingsPage() {
  await requireAdminSession("settings:read");
  return (
    <div className="space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">設定</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 診断の重み調整</CardTitle>
          <CardDescription>
            spec.md §3.6 で挙げられている管理者向け設定です。Phase 2 以降で実装します。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          姓名判断・四柱推命・資格マッチング・希望整合度の配点を運用ログを見ながら微調整できるよう、UI から係数を変更できるようにします。
        </CardContent>
      </Card>
    </div>
  );
}
