"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginWithCredentials,
  loginWithMagicLink,
  type LoginActionState,
} from "./actions";

const initialState: LoginActionState = { ok: false };

export function CredentialsForm() {
  const [state, formAction, pending] = useActionState(loginWithCredentials, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cred-email">メールアドレス</Label>
        <Input
          id="cred-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@growlink.local"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cred-password">パスワード</Label>
        <Input
          id="cred-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </div>
      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}

export function MagicLinkForm() {
  const [state, formAction, pending] = useActionState(loginWithMagicLink, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ml-email">メールアドレス</Label>
        <Input
          id="ml-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending ? "送信中..." : "ログインリンクを送る"}
      </Button>
    </form>
  );
}
