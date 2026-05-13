"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";
import type { FacilityActionState } from "./actions";

export type FacilityFormDefaults = {
  name?: string;
  category?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  fax?: string | null;
  email?: string | null;
  isFaxPublic?: boolean;
  notes?: string | null;
};

const initialState: FacilityActionState = { ok: false };

export function FacilityForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: FacilityActionState, fd: FormData) => Promise<FacilityActionState>;
  defaults?: FacilityFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name">施設名</Label>
          <Input id="name" name="name" defaultValue={defaults?.name ?? ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">業態</Label>
          <Select name="category" defaultValue={defaults?.category}>
            <SelectTrigger id="category">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="prefecture">都道府県</Label>
          <Input id="prefecture" name="prefecture" defaultValue={defaults?.prefecture ?? ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">市区町村</Label>
          <Input id="city" name="city" defaultValue={defaults?.city ?? ""} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="address">住所</Label>
        <Input id="address" name="address" defaultValue={defaults?.address ?? ""} required />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fax">FAX 番号</Label>
          <Input id="fax" name="fax" defaultValue={defaults?.fax ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">メール</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isFaxPublic" defaultChecked={defaults?.isFaxPublic} />
        FAX 番号を公開して良い
      </label>
      <div className="space-y-1">
        <Label htmlFor="notes">メモ</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={defaults?.notes ?? ""}
        />
      </div>
      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "保存中..." : submitLabel}
      </Button>
    </form>
  );
}
