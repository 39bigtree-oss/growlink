import "server-only";

import type { FacilityCategory } from "@prisma/client";

import { prisma } from "@/lib/db";
import { FACILITY_CATEGORY_OPTIONS } from "@/lib/constants/applicant-options";

/**
 * Phase 4: 施設マスタの CSV 一括インポート。
 *
 * 受け付ける形式 (UTF-8 / カンマ区切り / 先頭行はヘッダ):
 *   name,category,prefecture,city,address,fax,email,isFaxPublic,notes
 *
 * - category は FacilityCategory の英字キーまたは日本語ラベルを許容する。
 * - isFaxPublic は "true" / "yes" / "1" を真とみなす。空欄なら false。
 * - 既存 (name + prefecture + city) 一致は上書き (upsert)、未一致は新規作成。
 * - 各行はエラーが出ても他行の処理を止めない。失敗行は errors[] に集約。
 */

const CATEGORY_KEYS = new Set(FACILITY_CATEGORY_OPTIONS.map((o) => o.value as FacilityCategory));
const CATEGORY_LABEL_TO_KEY: Record<string, FacilityCategory> = Object.fromEntries(
  FACILITY_CATEGORY_OPTIONS.map((o) => [o.label, o.value as FacilityCategory]),
);

export type CsvRowResult = {
  rowNumber: number;
  ok: true;
  facilityId: string;
  action: "created" | "updated";
} | {
  rowNumber: number;
  ok: false;
  error: string;
};

export type ImportSummary = {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  results: CsvRowResult[];
};

export async function importFacilitiesCsv(csvText: string): Promise<ImportSummary> {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { totalRows: 0, created: 0, updated: 0, failed: 0, results: [] };
  }
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const required = ["name", "category", "prefecture", "city", "address"];
  for (const key of required) {
    if (!header.includes(key)) {
      return {
        totalRows: 0,
        created: 0,
        updated: 0,
        failed: 1,
        results: [{ rowNumber: 1, ok: false, error: `header missing required column: ${key}` }],
      };
    }
  }

  const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;
  const out: CsvRowResult[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c.trim() === "")) continue; // 空行はスキップ
    const rowNumber = i + 1;
    try {
      const cat = parseCategory(row[idx.category]);
      if (!cat) throw new Error(`invalid category: ${row[idx.category]}`);

      const data = {
        name: row[idx.name]?.trim() ?? "",
        category: cat,
        prefecture: row[idx.prefecture]?.trim() ?? "",
        city: row[idx.city]?.trim() ?? "",
        address: row[idx.address]?.trim() ?? "",
        fax: optional(row[idx.fax]),
        email: optional(row[idx.email]),
        isFaxPublic: parseBoolean(row[idx.ispublic ?? idx.isfaxpublic]),
        notes: optional(row[idx.notes]),
      };
      if (!data.name) throw new Error("name is empty");

      const existing = await prisma.facility.findFirst({
        where: { name: data.name, prefecture: data.prefecture, city: data.city },
        select: { id: true },
      });
      if (existing) {
        await prisma.facility.update({ where: { id: existing.id }, data });
        out.push({ rowNumber, ok: true, facilityId: existing.id, action: "updated" });
        updated += 1;
      } else {
        const created2 = await prisma.facility.create({ data });
        out.push({ rowNumber, ok: true, facilityId: created2.id, action: "created" });
        created += 1;
      }
    } catch (err) {
      failed += 1;
      out.push({ rowNumber, ok: false, error: (err as Error).message });
    }
  }
  return { totalRows: rows.length - 1, created, updated, failed, results: out };
}

function parseCategory(raw: string | undefined): FacilityCategory | null {
  if (!raw) return null;
  const v = raw.trim();
  if (CATEGORY_KEYS.has(v as FacilityCategory)) return v as FacilityCategory;
  return CATEGORY_LABEL_TO_KEY[v] ?? null;
}

function parseBoolean(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1" || v === "公開";
}

function optional(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 最小限の CSV パーサ。RFC 4180 に近い形でダブルクオート + エスケープ ("") を扱う。
 * ライブラリを増やすほどの規模ではないので自前で実装。
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      // CRLF を \n 1 つにまとめる
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else if (ch === '"' && cur === "") {
      inQuotes = true;
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
