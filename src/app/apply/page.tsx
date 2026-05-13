import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ApplyForm } from "./apply-form";

export const metadata = {
  title: "求職者申込フォーム | グロウリンク",
  description:
    "グロウリンクへの求職者申込フォーム。基本情報・連絡先・資格・希望をご入力ください。",
};

export default function ApplyPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-6 space-y-1 text-center">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">GROWLINK</p>
        <h1 className="text-2xl font-bold tracking-tight">求職者申込フォーム</h1>
        <p className="text-sm text-muted-foreground">
          4 ステップ・約 3 分で完了します。入力途中の内容は自動で一時保存されます。
        </p>
      </header>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">お申込み内容</CardTitle>
          <CardDescription>
            必須項目を入力し、最後に同意のうえ送信してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplyForm />
        </CardContent>
      </Card>
    </main>
  );
}
