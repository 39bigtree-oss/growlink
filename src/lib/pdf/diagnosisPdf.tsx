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
import type { FacilityCategory, Rank } from "@prisma/client";

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
    // 折り返しの自動ハイフネーションは日本語と相性が悪いので無効化。
    Font.registerHyphenationCallback((word) => [word]);
    fontRegistered = true;
  } catch (err) {
    // 登録失敗時もデフォルトフォントで生成は継続させる (PDF は出るが日本語が箱になる)。
    console.warn("[diagnosisPdf] font register failed:", err);
  }
}

export type DiagnosisPdfRow = {
  category: FacilityCategory;
  categoryLabel: string;
  score: number;
  rank: Rank;
  proComment: string;
  conComment: string;
};

export type DiagnosisPdfInput = {
  applicantFullName: string;
  generatedAt: Date;
  overview: string;
  rows: DiagnosisPdfRow[];
  /** 連絡先や会社名などをフッターに表示する */
  organization: {
    name: string;
    contact: string;
  };
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "NotoSansJP",
    fontSize: 9,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 8,
    marginBottom: 12,
  },
  logoBox: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoText: { fontSize: 14, fontWeight: 700, letterSpacing: 2 },
  date: { fontSize: 9, color: "#444" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  applicantName: { fontSize: 11, marginBottom: 12 },
  overviewBox: {
    backgroundColor: "#f4f4f5",
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1a1a1a",
  },
  overviewText: { fontSize: 10, lineHeight: 1.5 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  rowAlt: { backgroundColor: "#fafafa" },
  colCategory: { width: "26%" },
  colScore: { width: "10%", textAlign: "right" },
  colRank: { width: "8%", textAlign: "center", fontWeight: 700 },
  colPro: { width: "28%", paddingHorizontal: 4 },
  colCon: { width: "28%", paddingHorizontal: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7.5,
    color: "#666",
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    paddingTop: 6,
  },
});

export function DiagnosisDocument(input: DiagnosisPdfInput): React.ReactElement<DocumentProps> {
  ensureFont();
  const dateStr = formatDate(input.generatedAt);
  return (
    <Document
      title="AI 適職診断結果"
      author={input.organization.name}
      creator="Growlink"
      producer="Growlink"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>GROWLINK</Text>
          </View>
          <Text style={styles.date}>診断日: {dateStr}</Text>
        </View>

        <Text style={styles.title}>AI 適職診断結果</Text>
        <Text style={styles.applicantName}>{input.applicantFullName} 様</Text>

        <View style={styles.overviewBox}>
          <Text style={styles.overviewText}>{input.overview}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colCategory}>業態</Text>
          <Text style={styles.colScore}>スコア</Text>
          <Text style={styles.colRank}>ランク</Text>
          <Text style={styles.colPro}>向いている理由</Text>
          <Text style={styles.colCon}>配慮事項</Text>
        </View>

        {input.rows.map((row, idx) => (
          <View key={row.category} style={[styles.row, idx % 2 === 1 ? styles.rowAlt : {}]}>
            <Text style={styles.colCategory}>{row.categoryLabel}</Text>
            <Text style={styles.colScore}>{row.score}</Text>
            <Text style={styles.colRank}>{row.rank}</Text>
            <Text style={styles.colPro}>{row.proComment}</Text>
            <Text style={styles.colCon}>{row.conComment}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>
            {input.organization.name} / {input.organization.contact}
          </Text>
          <Text>
            本診断は姓名判断・四柱推命・数秘術・資格マッチング等を組み合わせた参考情報です。
            採否や処遇を決定するものではなく、面接でご経験や希望を伺ったうえで総合判断します。
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderDiagnosisPdf(input: DiagnosisPdfInput): Promise<Buffer> {
  ensureFont();
  return renderToBuffer(DiagnosisDocument(input));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
