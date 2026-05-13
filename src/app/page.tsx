import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 py-16">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">GROWLINK</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI採用・営業自動化システム
        </h1>
        <p className="text-muted-foreground">
          求職者の申込から AI 適職診断・面接・FAX 送信票生成までを一気通貫で。
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">管理画面ログイン</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/apply">求職者申込フォーム</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Phase 1-1 雛形 — Next.js + Prisma + Auth.js</p>
    </main>
  );
}
