export default function RootLoading() {
  return (
    <main className="mx-auto flex max-w-xl items-center justify-center px-6 py-24">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-sm text-muted-foreground"
      >
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        読み込み中...
      </div>
    </main>
  );
}
