"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

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

export function FacilityFilterBar({
  initial,
}: {
  initial: { prefecture?: string; category?: string; faxOnly?: boolean; applicantId?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [prefecture, setPrefecture] = useState(initial.prefecture ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [faxOnly, setFaxOnly] = useState(initial.faxOnly ?? false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (prefecture) sp.set("prefecture", prefecture);
    else sp.delete("prefecture");
    if (category) sp.set("category", category);
    else sp.delete("category");
    if (faxOnly) sp.set("faxOnly", "1");
    else sp.delete("faxOnly");
    router.push(`/admin/fax-sheets/new?${sp.toString()}`);
  }

  function reset() {
    setPrefecture("");
    setCategory("");
    setFaxOnly(false);
    const sp = new URLSearchParams();
    if (initial.applicantId) sp.set("applicantId", initial.applicantId);
    router.push(`/admin/fax-sheets/new?${sp.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end"
    >
      <div className="space-y-1">
        <Label htmlFor="prefecture" className="text-xs text-muted-foreground">
          都道府県
        </Label>
        <Input
          id="prefecture"
          value={prefecture}
          onChange={(e) => setPrefecture(e.target.value)}
          placeholder="例: 東京都"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category" className="text-xs text-muted-foreground">
          業態
        </Label>
        <Select value={category || "_ANY"} onValueChange={(v) => setCategory(v === "_ANY" ? "" : v)}>
          <SelectTrigger id="category">
            <SelectValue placeholder="すべて" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_ANY">すべて</SelectItem>
            {FACILITY_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={faxOnly} onCheckedChange={(v) => setFaxOnly(v === true)} />
        FAX 公開のみ
      </label>
      <Button type="submit" size="sm">
        絞り込み
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={reset}>
        リセット
      </Button>
    </form>
  );
}
