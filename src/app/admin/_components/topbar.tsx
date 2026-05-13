import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function AdminTopBar({ email, name }: { email: string; name: string | null | undefined }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3 md:hidden">
        <span className="text-sm font-bold tracking-widest">GROWLINK</span>
        <span className="text-xs text-muted-foreground">管理画面</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{name ?? email}</span>
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
      </div>
    </header>
  );
}
