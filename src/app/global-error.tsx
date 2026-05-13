"use client";

/**
 * App Router の最上位エラーバウンダリ。
 * `error.tsx` でキャッチできない、layout を含む再描画失敗もここで受ける。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-xl px-6 py-24">
          <h1 className="mb-2 text-2xl font-semibold">予期せぬエラーが発生しました</h1>
          <p className="text-sm text-muted-foreground">
            申し訳ありません。原因の特定中です。お手数ですが再度お試しください。
          </p>
          {error.digest && (
            <p className="mt-3 text-xs text-muted-foreground">エラー ID: {error.digest}</p>
          )}
          <button
            onClick={() => reset()}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            再試行
          </button>
        </main>
      </body>
    </html>
  );
}
