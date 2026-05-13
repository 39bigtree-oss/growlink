import "server-only";

import path from "node:path";
import React from "react";

import {
  Document,
  type DocumentProps,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { FaxBody } from "@/lib/ai/fax/buildFaxBody";
import type { MaskedApplicantForFax } from "@/lib/mask";

const NOTO_REGULAR = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff",
);
const NOTO_BOLD = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff",
);

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  try {
    Font.register({
      family: "NotoSansJP",
      fonts: [
        { src: NOTO_REGULAR, fontWeight: 400 },
        { src: NOTO_BOLD, fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontRegistered = true;
  } catch (err) {
    console.warn("[faxSheetPdf] font register failed:", err);
  }
}

export type FaxSheetPdfInput = {
  facility: {
    name: string;
    prefecture: string;
    city: string;
    fax: string | null;
  };
  organization: { name: string; contact: string; replyFax: string };
  applicant: MaskedApplicantForFax;
  topDiagnosis: { rank: string; score: number; categoryLabel: string } | null;
  body: FaxBody;
  desired: {
    schedule?: string;
    startMonth?: string;
  };
  commuteArea?: string;
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "NotoSansJP",
    fontSize: 9,
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 6,
    marginBottom: 10,
  },
  logoBox: { borderWidth: 1, borderColor: "#111827", paddingHorizontal: 8, paddingVertical: 4 },
  logoText: { fontSize: 13, fontWeight: 700, letterSpacing: 2 },
  meta: { fontSize: 8, color: "#374151", textAlign: "right" },
  addressBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  to: { fontSize: 11, fontWeight: 700 },
  from: { fontSize: 9, color: "#374151" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  paragraph: { fontSize: 10, lineHeight: 1.55, marginBottom: 6 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#111827",
    paddingLeft: 6,
  },
  table: {
    borderWidth: 0.5,
    borderColor: "#9ca3af",
    marginBottom: 8,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d1d5db" },
  tableRowLast: { flexDirection: "row" },
  th: {
    width: "30%",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  td: { width: "70%", paddingVertical: 4, paddingHorizontal: 6, fontSize: 9 },
  replyBox: {
    borderWidth: 1,
    borderColor: "#111827",
    padding: 8,
    marginTop: 10,
  },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#111827",
    marginRight: 6,
  },
  bulletItem: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 8, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    fontSize: 7,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#9ca3af",
    paddingTop: 4,
  },
});

export function FaxSheetDocument(input: FaxSheetPdfInput): React.ReactElement<DocumentProps> {
  ensureFont();
  const dateStr = formatDate(input.generatedAt);
  const applicantLabel = `${input.applicant.initials} 様 / ${input.applicant.genderLabel} / ${input.applicant.ageLabel}`;
  const desiredSchedule = input.desired.schedule ?? "本人と最終調整のうえご共有";
  const startMonth = input.desired.startMonth ?? "本人とすり合わせのうえご連絡";
  const replyFax = input.organization.replyFax;

  return (
    <Document
      title="FAX 送信票"
      author={input.organization.name}
      creator="Growlink"
      producer="Growlink"
    >
      {/* 1 枚目 — 表紙兼提案書 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>GROWLINK</Text>
          </View>
          <View style={styles.meta}>
            <Text>送信日時: {dateStr}</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>

        <View style={styles.addressBlock}>
          <View>
            <Text style={styles.to}>{input.facility.name}</Text>
            <Text style={styles.to}>採用ご担当者様</Text>
            <Text style={styles.from}>
              {input.facility.prefecture}
              {input.facility.city}
              {input.facility.fax ? ` / FAX ${input.facility.fax}` : ""}
            </Text>
          </View>
          <View>
            <Text style={styles.from}>差出人</Text>
            <Text style={styles.from}>{input.organization.name}</Text>
            <Text style={styles.from}>{input.organization.contact}</Text>
            <Text style={styles.from}>返信用 FAX: {replyFax}</Text>
          </View>
        </View>

        <Text style={styles.title}>{input.body.cover.headline}</Text>
        <Text style={styles.paragraph}>{input.body.cover.greeting}</Text>
        <Text style={styles.paragraph}>{input.body.cover.summary}</Text>

        <Text style={styles.sectionTitle}>候補者サマリ (個人情報マスク済み)</Text>
        <View style={styles.table}>
          <Row label="候補者" value={applicantLabel} />
          <Row label="保有資格" value={fmtList(input.applicant.qualifications, "未登録")} />
          <Row
            label="希望業態 (本紙施設との関連)"
            value={input.topDiagnosis?.categoryLabel ?? "─"}
          />
          <Row
            label="AI 適職診断 (本紙施設カテゴリ)"
            value={
              input.topDiagnosis
                ? `ランク ${input.topDiagnosis.rank} / ${input.topDiagnosis.score} 点`
                : "未診断"
            }
          />
          <Row label="希望勤務" value={desiredSchedule} />
          <Row label="開始可能時期" value={startMonth} last />
        </View>

        <Text style={styles.paragraph}>{input.body.cover.callToAction}</Text>

        <View style={styles.replyBox}>
          <Text style={{ fontWeight: 700, marginBottom: 6 }}>返信欄</Text>
          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text>興味あり → 詳細を希望します</Text>
          </View>
          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text>検討中 (後日改めて連絡を希望)</Text>
          </View>
          <View style={styles.checkRow}>
            <View style={styles.checkbox} />
            <Text>今回は不要</Text>
          </View>
          <Text style={{ marginTop: 6 }}>折返し希望コメント:</Text>
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#9ca3af",
              height: 14,
              marginTop: 2,
            }}
          />
          <View
            style={{
              borderBottomWidth: 0.5,
              borderBottomColor: "#9ca3af",
              height: 14,
              marginTop: 2,
            }}
          />
          <Text style={{ marginTop: 6 }}>返信用 FAX 番号: {replyFax}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {input.organization.name} / {input.organization.contact}
          </Text>
          <Text>
            本書類には個人情報は記載していません。記載のイニシャル・年代等は本人特定を避ける目的でマスクしています。
          </Text>
        </View>
      </Page>

      {/* 2 枚目 — 詳細スキル */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>GROWLINK</Text>
          </View>
          <View style={styles.meta}>
            <Text>送信日時: {dateStr}</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>

        <Text style={styles.title}>候補者 詳細スキル</Text>
        <Text style={styles.paragraph}>
          候補者: {applicantLabel} / 保有資格 {fmtList(input.applicant.qualifications, "未登録")}
        </Text>

        <Text style={styles.sectionTitle}>AI 面接サマリ</Text>
        <Text style={styles.paragraph}>{input.body.detail.interviewSummary}</Text>

        <Text style={styles.sectionTitle}>職務経歴ハイライト</Text>
        <View>
          {input.body.detail.careerHighlights.map((s, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletDot}>・</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>強み・特徴</Text>
        <View>
          {input.body.detail.strengths.map((s, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletDot}>・</Text>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>通勤可能エリア / 開始時期</Text>
        <View style={styles.table}>
          <Row label="通勤エリア" value={input.body.detail.commuteAreaNote} />
          <Row label="開始可能時期" value={input.body.detail.startAvailability} last />
        </View>

        <Text style={styles.sectionTitle}>紹介条件・手数料の概要</Text>
        <Text style={styles.paragraph}>{input.body.detail.introTermsNote}</Text>

        <View style={styles.footer} fixed>
          <Text>
            {input.organization.name} / {input.organization.contact}
          </Text>
          <Text>
            本紙の情報は本人面談時点のものであり、最終的なご紹介条件は別途協議の上、決定いたします。
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderFaxSheetPdf(input: FaxSheetPdfInput): Promise<Buffer> {
  ensureFont();
  return renderToBuffer(FaxSheetDocument(input));
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.th}>{label}</Text>
      <Text style={styles.td}>{value}</Text>
    </View>
  );
}

function fmtList(items: string[] | null | undefined, fallback: string): string {
  if (!items || items.length === 0) return fallback;
  return items.join(" / ");
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
