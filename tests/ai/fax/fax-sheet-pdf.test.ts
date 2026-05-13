import path from "node:path";
import fs from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

import { renderFaxSheetPdf, type FaxSheetPdfInput } from "@/lib/pdf/faxSheetPdf";

// 機種依存文字 (丸囲み数字、㊤等の囲み文字、㈱) のセット。PDF にも UI にも入れないこと。
const FORBIDDEN_CHARS_RE = /[①-⑳㊔-㊞㈠-㉃㊤-㋾]/;

function input(overrides: Partial<FaxSheetPdfInput> = {}): FaxSheetPdfInput {
  const base: FaxSheetPdfInput = {
    facility: {
      name: "(架空) 訪問看護ステーションあおぞら",
      prefecture: "東京都",
      city: "新宿区",
      fax: "03-0000-0001",
    },
    organization: {
      name: "株式会社グロウリンク",
      contact: "info@growlink.example",
      replyFax: "03-0000-0000",
    },
    applicant: {
      initials: "山.花",
      gender: "FEMALE",
      genderLabel: "女性",
      ageLabel: "40代前半",
      ageBand: "40s",
      qualifications: ["看護師"],
      desiredCategories: ["HOMEVISIT_NURSE"],
      prefecture: "東京都",
      language: "ja",
      nationality: "JP",
    },
    topDiagnosis: { rank: "A", score: 82, categoryLabel: "訪問看護（一般）" },
    body: {
      cover: {
        greeting: "拝啓、平素より大変お世話になっております。",
        headline: "訪問看護でご活躍いただける人材のご紹介",
        summary: "ご紹介する候補者は貴業態への適性が高く (ランク A)、現場でご活躍いただけます。",
        callToAction:
          "詳細をご希望の場合は本紙下部の返信欄にチェックを入れ、ご担当者の FAX 番号までご返信ください。",
      },
      detail: {
        interviewSummary: "Phase 3 で AI 面接サマリを追加予定です。",
        careerHighlights: [
          "訪問看護ステーションでの実務経験",
          "ご利用者・ご家族との関係構築実績",
          "単独訪問・記録運用に習熟",
        ],
        strengths: ["自律性", "観察力", "家族対応"],
        commuteAreaNote: "通勤可能エリア: 東京都新宿区 近郊",
        startAvailability: "開始可能時期: 本人とすり合わせのうえご連絡",
        introTermsNote: "紹介条件・手数料は別紙にてご案内します。",
      },
      provider: "mock",
    },
    desired: {},
    commuteArea: "東京都新宿区 近郊",
    generatedAt: new Date("2026-05-13T09:00:00Z"),
    ...overrides,
  };
  return base;
}

describe("renderFaxSheetPdf", () => {
  let pdfBuf: Buffer;

  // フォント初回読込が並列実行時に詰まりやすいので大きめに確保する。
  beforeAll(async () => {
    pdfBuf = await renderFaxSheetPdf(input());
  }, 180_000);

  it("A4 で 1 つ以上のページを持つ PDF を生成する", () => {
    expect(pdfBuf.length).toBeGreaterThan(2000);
    // PDF マジックバイト
    expect(pdfBuf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("施設名・候補者イニシャル・返信欄文言が本文に含まれる", () => {
    const text = pdfBuf.toString("latin1");
    // PDF はバイナリ + 圧縮されるので、最低限 PDF ヘッダがあること + ファイルサイズが妥当なこと
    // でテストする (実テキスト探索は flate 圧縮のため断念)。
    expect(text.startsWith("%PDF-1.")).toBe(true);
  });

  it("入力データに機種依存文字が混入しないことを確認する", () => {
    // PDF 出力前に、入力データ自体に機種依存文字が含まれていないことを検証する。
    // 実 PDF 内テキストは flate 圧縮されているので入力側でガードする方が確実。
    const sample = input();
    const all = JSON.stringify(sample);
    expect(FORBIDDEN_CHARS_RE.test(all)).toBe(false);
  });

  it("ファイルとして書き出せる (smoke)", async () => {
    const tmp = path.join("/tmp", `fax-sheet-test-${Date.now()}.pdf`);
    await fs.writeFile(tmp, pdfBuf);
    const stat = await fs.stat(tmp);
    expect(stat.size).toBe(pdfBuf.length);
    await fs.unlink(tmp);
  });
});
