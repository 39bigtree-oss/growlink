import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/session";

import { NewApplicantForm } from "./_form";

export const metadata = { title: "求職者を新規登録 | Tsumugi" };
export const dynamic = "force-dynamic";

export default async function NewApplicantPage() {
  // RBAC: applicants:write が必要 (ADMIN / CONSULTANT)
  await requireAdminSession("applicants:write");
  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">求職者を新規登録</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            連絡先の入力 → 自動で AI 適職診断が走り、診断 PDF を添付した
            スキルシート入力依頼メールが本人へ送信されます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/applicants">申込一覧に戻る</Link>
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">基本情報 + 希望条件</CardTitle>
          <CardDescription>
            社内オペレータが代理入力します。求職者本人の自己応募 (将来の HP 連動) と分かれて記録されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewApplicantForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">登録後に自動で行われること</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>① <strong>AI 適職診断</strong> を即時実行 (11 業態 × ランク S/A/B/C/D)</p>
          <p>② <strong>診断結果を A4 2 枚の PDF</strong> として生成</p>
          <p>③ <strong>スキルシート入力依頼メール</strong> を本人へ送信 (上記 PDF を添付)</p>
          <p>④ 求職者は届いたメールから個人専用 URL でスキルシートを入力 (履歴書 PDF をアップロードすれば AI が自動転記)</p>
        </CardContent>
      </Card>
    </div>
  );
}
