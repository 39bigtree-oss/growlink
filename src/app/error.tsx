"use client";

import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h1 className="mb-2 text-xl font-semibold text-destructive">画面の読み込みに失敗しました</h1>
        <p className="text-sm text-muted-foreground">
          一時的な問題の可能性があります。再試行するか、ダッシュボードに戻って操作を続けてください。
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground">エラー ID: {error.digest}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => reset()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            再試行
          </button>
          <Link
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
