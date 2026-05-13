import Link from "next/link";

export const metadata = { title: "404 Not Found | グロウリンク" };

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">お探しのページが見つかりません</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        URL が変更されたか、リンクが古くなっている可能性があります。
      </p>
      <div className="mt-6 inline-flex gap-2">
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          ホームへ戻る
        </Link>
        <Link
          href="/apply"
          className="rounded-md border border-input bg-background px-4 py-2 text-sm"
        >
          求職者として申込む
        </Link>
      </div>
    </main>
  );
}
