import type { FacilityCategory } from "@prisma/client";

import categoryAffinity from "./data/category-affinity.json";
import type { BirthSubScore, FiveElement } from "./types";
import { MAX_BIRTH_SCORE } from "./types";

type CategoryAffinity = {
  favoredJinkaku: number[];
  favoredElements: string[];
  favoredLifePath: number[];
  adjacent: string[];
};
const AFFINITY: Readonly<Record<string, CategoryAffinity>> = categoryAffinity.categories;

/**
 * 西暦年から年柱の天干 (0=甲, 9=癸) を返し、五行に対応付ける。
 * 甲乙=木 / 丙丁=火 / 戊己=土 / 庚辛=金 / 壬癸=水。
 * 西暦 4 年が「甲子」相当という慣例に従い (year - 4) % 10 で天干を求める。
 */
export function yearElement(year: number): FiveElement {
  const stem = ((year - 4) % 10 + 10) % 10;
  if (stem < 2) return "wood";
  if (stem < 4) return "fire";
  if (stem < 6) return "earth";
  if (stem < 8) return "metal";
  return "water";
}

function sumDigits(n: number): number {
  let s = 0;
  let x = Math.abs(n);
  while (x > 0) {
    s += x % 10;
    x = Math.floor(x / 10);
  }
  return s;
}

const MASTER_NUMBERS = new Set([11, 22, 33]);

/**
 * 数秘術のライフパス・ナンバー。生年月日 (YYYY-MM-DD) を全桁加算し、
 * 11/22/33 (マスターナンバー) を保持しつつ単桁まで還元する。
 */
export function lifePathNumber(year: number, month: number, day: number): number {
  let total = sumDigits(year) + sumDigits(month) + sumDigits(day);
  while (total > 9 && !MASTER_NUMBERS.has(total)) {
    total = sumDigits(total);
  }
  return total;
}

function parseBirth(birthDate: Date | string): { year: number; month: number; day: number } {
  const iso = typeof birthDate === "string" ? birthDate : birthDate.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    throw new Error(`birthDate must be YYYY-MM-DD or Date, got: ${String(birthDate)}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function elementAffinity(applicantEl: FiveElement, favored: string[]): number {
  if (favored.includes(applicantEl)) return 1.0;
  // 五行の相生 (生む側): 木→火, 火→土, 土→金, 金→水, 水→木
  const generates: Record<FiveElement, FiveElement> = {
    wood: "fire",
    fire: "earth",
    earth: "metal",
    metal: "water",
    water: "wood",
  };
  if (favored.includes(generates[applicantEl])) return 0.65;
  return 0.35;
}

function lifePathAffinity(lp: number, favored: number[]): number {
  if (favored.includes(lp)) return 1.0;
  // マスターナンバーは対応する単桁にも適合判定する。
  if (lp === 11 && favored.includes(2)) return 0.85;
  if (lp === 22 && favored.includes(4)) return 0.85;
  if (lp === 33 && favored.includes(6)) return 0.85;
  // ±1 を adjacent とみなす。
  if (favored.some((v) => Math.abs(v - lp) === 1)) return 0.6;
  return 0.3;
}

/**
 * 生年月日スコア (0-30)。年柱五行・ライフパスナンバーの 2 軸で業態相性を取り、
 * 五行 60% : Life Path 40% の重みで合算する。
 *
 * gender は将来の四柱推命拡張のために受け取るが、Phase 1-4 ではスコアに使わない。
 */
export function calculateBirthScore(
  birthDate: Date | string,
  _gender: "MALE" | "FEMALE" | "OTHER",
  category: FacilityCategory,
): BirthSubScore {
  void _gender;
  const { year, month, day } = parseBirth(birthDate);
  const element = yearElement(year);
  const lp = lifePathNumber(year, month, day);

  const a = AFFINITY[category];
  const elScore = elementAffinity(element, a?.favoredElements ?? []);
  const lpScore = lifePathAffinity(lp, a?.favoredLifePath ?? []);
  const normalized = elScore * 0.6 + lpScore * 0.4;

  return {
    value: Math.round(MAX_BIRTH_SCORE * normalized),
    details: { yearElement: element, lifePath: lp },
  };
}
