import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "求職者申込フォーム | グロウリンク",
};

export default function ApplyPage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-xl flex-col justify-center py-12">
      <Card>
        <CardHeader>
          <CardTitle>求職者申込フォーム</CardTitle>
          <CardDescription>
            この画面は Phase 1-3 で実装予定です。現在は雛形のみが用意されています。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">トップに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
