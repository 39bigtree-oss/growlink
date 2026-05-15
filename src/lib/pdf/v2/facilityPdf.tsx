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

import type { DiagnosisV2Result } from "@/lib/ai/diagnosis-v2/scorer";
import { CATEGORY_LABEL } from "@/lib/ai/diagnosis-v2/scorer";

const NOTO_REG = path.join(process.cwd(), "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff");
const NOTO_BOLD = path.join(process.cwd(), "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff");

let registered = false;
function ensureFont() {
  if (registered) return;
  try {
    Font.register({
      family: "NotoSansJP",
      fonts: [
        { src: NOTO_REG, fontWeight: 400 },
        { src: NOTO_BOLD, fontWeight: 700 },
      ],
    });
    Font.registerHyphenationCallback((w) => [w]);
    registered = true;
  } catch (err) {
    console.warn("[v2 facility pdf] font register failed", err);
  }
}

/**
 * 施設・紹介先向け PDF。求職者向けと違い:
 *   - 業務適性・リスク要因を客観データで提示
 *   - 動物・カラフルな装飾なし
 *   - チェックリスト形式で読みやすく
 */

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "NotoSansJP", fontSize: 9, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 6,
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: 700 },
  date: { fontSize: 8, color: "#666" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
    marginTop: 8,
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderColor: "#e2e8f0" },
  label: { width: 110, color: "#475569" },
  value: { flex: 1 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontWeight: 700,
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  th1: { flex: 2 },
  th2: { width: 35, textAlign: "right" },
  th3: { width: 30, textAlign: "center" },
  th4: { flex: 3, fontSize: 8, color: "#475569" },
  note: {
    fontSize: 8,
    color: "#666",
    marginTop: 8,
    backgroundColor: "#fef9c3",
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#eab308",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 7,
    color: "#999",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 4,
  },
});

export type FacilityPdfInput = {
  applicantInitials: string; // 氏名はイニシャル表記 (PII 最小化)
  qualifications: string[];
  experienceYears: number;
  generatedAt: Date;
  diagnosis: DiagnosisV2Result;
};

export async function renderFacilityDiagnosisPdf(input: FacilityPdfInput): Promise<Buffer> {
  ensureFont();
  const d = input.diagnosis;
  return renderToBuffer(
    <Document title={`紹介候補者 ${input.applicantInitials} 適性レポート`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>紹介候補者 適性レポート</Text>
          <Text style={styles.date}>{input.generatedAt.toISOString().slice(0, 10)}</Text>
        </View>

        <View>
          <View style={styles.row}>
            <Text style={styles.label}>候補者イニシャル</Text>
            <Text style={styles.value}>{input.applicantInitials}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>キャリア・タイプ</Text>
            <Text style={styles.value}>{d.typeCode} ({d.type.name})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>保有資格</Text>
            <Text style={styles.value}>{input.qualifications.join(" / ") || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>経験年数</Text>
            <Text style={styles.value}>{input.experienceYears} 年</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>1. 4 大エンジン性能</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.th1}>指標</Text>
          <Text style={styles.th2}>Sc</Text>
          <Text style={styles.th3}>Rank</Text>
          <Text style={styles.th4}>コメント</Text>
        </View>
        {[
          { label: "総合パワー", e: d.engines.totalPower },
          { label: "基礎力 (継続・誠実)", e: d.engines.foundation },
          { label: "実務力 (実行)", e: d.engines.execution },
          { label: "頭脳力 (分析)", e: d.engines.intellect },
        ].map((row) => (
          <View key={row.label} style={styles.tableRow}>
            <Text style={styles.th1}>{row.label}</Text>
            <Text style={styles.th2}>{row.e.score}</Text>
            <Text style={styles.th3}>{row.e.rank}</Text>
            <Text style={styles.th4}>{row.e.comment}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>2. 候補者の特性 (4 軸スコア)</Text>
        <View style={styles.tableRow}>
          <Text style={styles.th1}>共感力 (Caring)</Text>
          <Text style={styles.th2}>{d.traits.caring}</Text>
          <Text style={styles.th3}> </Text>
          <Text style={styles.th4}>{d.traits.caring >= 70 ? "高い (人間関係構築型)" : "中程度"}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.th1}>行動力 (Energetic)</Text>
          <Text style={styles.th2}>{d.traits.energetic}</Text>
          <Text style={styles.th3}> </Text>
          <Text style={styles.th4}>{d.traits.energetic >= 70 ? "高い (推進型)" : "中程度"}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.th1}>チーム志向 (Team)</Text>
          <Text style={styles.th2}>{d.traits.team}</Text>
          <Text style={styles.th3}> </Text>
          <Text style={styles.th4}>
            {d.traits.team >= 70 ? "高い (協調型)" : d.traits.team < 40 ? "低め (単独行動向き)" : "中程度"}
          </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.th1}>安定性 (Stable)</Text>
          <Text style={styles.th2}>{d.traits.stable}</Text>
          <Text style={styles.th3}> </Text>
          <Text style={styles.th4}>{d.traits.stable >= 70 ? "高い (継続的)" : "中程度"}</Text>
        </View>

        <Text style={styles.sectionTitle}>3. 業態別適性 (希望業態のみ)</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.th1}>業態</Text>
          <Text style={styles.th2}>Sc</Text>
          <Text style={styles.th3}>Rank</Text>
          <Text style={styles.th4}>コメント</Text>
        </View>
        {d.desiredFit.map((f) => (
          <View key={f.category} style={styles.tableRow}>
            <Text style={styles.th1}>{CATEGORY_LABEL[f.category]}</Text>
            <Text style={styles.th2}>{f.score}</Text>
            <Text style={styles.th3}>{f.rank}</Text>
            <Text style={styles.th4}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
          </View>
        ))}

        {d.hiddenFit.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>4. 隠れた適性 (希望外で相性良)</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.th1}>業態</Text>
              <Text style={styles.th2}>Sc</Text>
              <Text style={styles.th3}>Rank</Text>
              <Text style={styles.th4}>コメント</Text>
            </View>
            {d.hiddenFit.map((f) => (
              <View key={f.category} style={styles.tableRow}>
                <Text style={styles.th1}>{CATEGORY_LABEL[f.category]}</Text>
                <Text style={styles.th2}>{f.score}</Text>
                <Text style={styles.th3}>{f.rank}</Text>
                <Text style={styles.th4}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>5. 留意点 (現場マッチに必要な確認事項)</Text>
        {d.watchPoints.map((w, i) => (
          <Text key={i} style={{ paddingVertical: 2, fontSize: 9 }}>・{w}</Text>
        ))}

        <View style={styles.note}>
          <Text style={{ fontWeight: 700, fontSize: 8, marginBottom: 2 }}>本レポートの位置づけ</Text>
          <Text>
            本レポートは複数の心理学的フレームワーク (Big Five, DISC, RIASEC) を AI が統合判定した参考情報です。
            最終的な採用判断は、必ず本人面談と業務体験を組み合わせて行ってください。
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Powered by Tsumugi — AI Care Type Diagnosis v2.0</Text>
        </View>
      </Page>
    </Document>,
  );
}
