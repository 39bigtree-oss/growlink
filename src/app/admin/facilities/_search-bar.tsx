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

export function FacilitySearchBar({
  initial,
}: {
  initial: { q?: string; prefecture?: string; city?: string; category?: string; faxOnly?: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initial.q ?? "");
  const [prefecture, setPrefecture] = useState(initial.prefecture ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [faxOnly, setFaxOnly] = useState(initial.faxOnly ?? false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    setOrDelete(sp, "q", q);
    setOrDelete(sp, "prefecture", prefecture);
    setOrDelete(sp, "city", city);
    setOrDelete(sp, "category", category);
    if (faxOnly) sp.set("faxOnly", "1");
    else sp.delete("faxOnly");
    router.push(`/admin/facilities?${sp.toString()}`);
  }

  function reset() {
    setQ(""); setPrefecture(""); setCity(""); setCategory(""); setFaxOnly(false);
    router.push("/admin/facilities");
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto] md:items-end">
      <div className="space-y-1">
        <Label htmlFor="q" className="text-xs text-muted-foreground">施設名 / 住所</Label>
        <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="フリーテキスト" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="prefecture" className="text-xs text-muted-foreground">都道府県</Label>
        <Input id="prefecture" value={prefecture} onChange={(e) => setPrefecture(e.target.value)} placeholder="例: 東京都" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="city" className="text-xs text-muted-foreground">市区町村</Label>
        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="例: 新宿区" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category" className="text-xs text-muted-foreground">業態</Label>
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
      <Button type="submit" size="sm">絞り込み</Button>
      <Button type="button" variant="outline" size="sm" onClick={reset}>リセット</Button>
    </form>
  );
}

function setOrDelete(sp: URLSearchParams, key: string, value: string) {
  if (value) sp.set(key, value);
  else sp.delete(key);
}
