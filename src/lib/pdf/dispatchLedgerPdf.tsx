import "server-only";

import path from "node:path";
import React from "react";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

const NOTO_SANS_JP_REGULAR = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff",
);
const NOTO_SANS_JP_BOLD = path.join(
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
        { src: NOTO_SANS_JP_REGULAR, fontWeight: 400 },
        { src: NOTO_SANS_JP_BOLD, fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontRegistered = true;
  } catch (err) {
    console.warn("[dispatchLedgerPdf] font register failed:", err);
  }
}

export type DispatchLedgerPdfInput = {
  ledgerId: string;
  applicantFullName: string;
  facilityName: string;
  jobOrderTitle: string;
  dispatchPeriodStart: Date;
  dispatchPeriodEnd: Date;
  antiteishokuDate: Date;
  dispatchManagerName: string;
  receivingManagerName: string;
  socialInsuranceEnrolled: boolean;
  contractCount: number;
  notes: string | null;
  daysUntilAntiteishoku: number;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "NotoSansJP", fontSize: 10, color: "#111" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: "#f5f5f4",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderColor: "#ddd" },
  label: { width: 130, color: "#555" },
  value: { flex: 1, fontWeight: 700 },
  alert: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#b91c1c",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
  },
  footer: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    fontSize: 8,
    color: "#666",
  },
});

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function renderDispatchLedgerPdf(input: DispatchLedgerPdfInput): Promise<Buffer> {
  ensureFont();
  const approaching = input.daysUntilAntiteishoku >= 0 && input.daysUntilAntiteishoku <= 90;
  return renderToBuffer(
    <Document title={`派遣台帳 ${input.applicantFullName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>派遣台帳</Text>
        <Text style={styles.subtitle}>
          発行日: {formatDate(new Date())} / 台帳 ID: {input.ledgerId}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>派遣労働者</Text>
          <View style={styles.row}>
            <Text style={styles.label}>氏名</Text>
            <Text style={styles.value}>{input.applicantFullName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>派遣先</Text>
          <View style={styles.row}>
            <Text style={styles.label}>事業所</Text>
            <Text style={styles.value}>{input.facilityName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>業務内容</Text>
            <Text style={styles.value}>{input.jobOrderTitle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>派遣先責任者</Text>
            <Text style={styles.value}>{input.receivingManagerName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>派遣期間</Text>
          <View style={styles.row}>
            <Text style={styles.label}>開始日</Text>
            <Text style={styles.value}>{formatDate(input.dispatchPeriodStart)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>終了日</Text>
            <Text style={styles.value}>{formatDate(input.dispatchPeriodEnd)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>抵触日 (3 年ルール)</Text>
            <Text style={styles.value}>{formatDate(input.antiteishokuDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>契約締結回数</Text>
            <Text style={styles.value}>{input.contractCount}</Text>
          </View>
          {approaching ? (
            <Text style={styles.alert}>
              ⚠ 抵触日まで {input.daysUntilAntiteishoku} 日です。継続には事業所単位の意見聴取手続が必要です。
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>派遣元 / 社会保険</Text>
          <View style={styles.row}>
            <Text style={styles.label}>派遣元責任者</Text>
            <Text style={styles.value}>{input.dispatchManagerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>社会保険加入</Text>
            <Text style={styles.value}>{input.socialInsuranceEnrolled ? "加入済" : "未加入 / 確認要"}</Text>
          </View>
        </View>

        {input.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備考</Text>
            <Text>{input.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          本書は労働者派遣法施行規則 第 31 条 (派遣元管理台帳) に基づき作成された電子台帳の写しです。
          実運用では 3 年間保存し、社内責任者の確認印を付与してください。
        </Text>
      </Page>
    </Document>,
  );
}
