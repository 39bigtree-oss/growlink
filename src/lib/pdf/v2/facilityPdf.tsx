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
 * 施設・紹介先向け PDF (v2.0.4 改修)。
 *
 * v2.0.3 までの問題:
 *   - 「中程度」など曖昧な表現が多かった
 *   - イニシャルが漢字 (姓名先頭文字) だった
 *   - コメントが「説明」になっていて施設目線で活かせる情報が少なかった
 *
 * v2.0.4 で:
 *   - イニシャルをローマ字 (例: H.N.) 化
 *   - 「中程度」を撤廃し、施設目線で「この特性をどう活かすか / 何に気をつけるか」
 *   - 4 大エンジンも施設視点でアピールポイントを記述
 *   - 業態別コメントを施設目線で
 */

const COLORS = {
  primary: "#1e3a8a",
  bg: "#f8fafc",
  bgAlt: "#f1f5f9",
  border: "#e2e8f0",
  textMuted: "#475569",
  accent: "#eab308",
  danger: "#dc2626",
};

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "NotoSansJP", fontSize: 8.5, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 5,
    marginBottom: 8,
  },
  title: { fontSize: 13, fontWeight: 700 },
  date: { fontSize: 7.5, color: "#666" },
  metaTable: { marginBottom: 6 },
  metaRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
  },
  metaLabel: { width: 95, color: COLORS.textMuted, fontSize: 8 },
  metaValue: { flex: 1, fontSize: 8.5 },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    backgroundColor: COLORS.bgAlt,
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    marginBottom: 4,
    marginTop: 7,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    fontWeight: 700,
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: "flex-start",
  },
  th1: { flex: 2 },
  th2: { width: 38, textAlign: "right", fontWeight: 700 },
  th3: { width: 26, textAlign: "center", fontWeight: 700, color: COLORS.primary },
  th4: { flex: 4, fontSize: 7.5, color: COLORS.textMuted, lineHeight: 1.5, paddingLeft: 4 },
  note: {
    fontSize: 7.5,
    color: "#666",
    marginTop: 6,
    backgroundColor: "#fef9c3",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    lineHeight: 1.5,
  },
  watchSection: {
    marginTop: 5,
    backgroundColor: "#fef2f2",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  watchTitle: { fontWeight: 700, fontSize: 8, color: "#991b1b", marginBottom: 3 },
  watchItem: { fontSize: 7.5, marginBottom: 2, lineHeight: 1.5 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    fontSize: 6.5,
    color: "#999",
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 3,
  },
});

export type FacilityPdfInput = {
  /** ローマ字イニシャル (例: "H.N.") */
  applicantInitials: string;
  qualifications: string[];
  experienceYears: number;
  generatedAt: Date;
  diagnosis: DiagnosisV2Result;
};

/** 4 軸の値 → 施設目線のコメント (どう活かすか / 何に気をつけるか) */
function traitFacilityComment(name: "caring" | "energetic" | "team" | "stable", score: number): string {
  const v = Math.floor(score);
  if (name === "caring") {
    if (v >= 80) return `共感力が高く、ご家族とのコミュニケーションで信頼を集めやすい。家族対応の窓口役として配置すると即戦力。`;
    if (v >= 65) return `利用者・家族の感情を察する力があり、丁寧なケアが期待できる。多忙時は感情労働の負担増に留意。`;
    return `論理的・客観的な判断を得意とする。データ重視の場面や記録業務で力を発揮しやすい。`;
  }
  if (name === "energetic") {
    if (v >= 80) return `テンポよく動ける推進型。急変時や立ち上げフェーズで頼れる存在。指示の優先順位は明確にすると活きる。`;
    if (v >= 65) return `必要な場面でしっかり動ける行動力あり。研修期間でも順応が早い見込み。`;
    return `慎重に判断するタイプ。記録や計画立案など腰を据える業務が向く。即断を求める配置は段階的に。`;
  }
  if (name === "team") {
    if (v >= 80) return `チーム協調を重視。多職種カンファや申し送りでまとめ役として機能しやすい。`;
    if (v >= 65) return `状況に応じて協調と独立を使い分けられる。配属先のチーム文化に応じた説明があると馴染みやすい。`;
    return `自律的に動くタイプ。訪問系・1 人夜勤など独立判断が必要な現場で力を発揮。チーム業務は明確な役割分担を。`;
  }
  // stable
  if (v >= 80) return `継続力が高く、長期勤続の見込みあり。長期支援の現場ほど力を発揮します。`;
  if (v >= 65) return `安定して業務を積み上げるタイプ。引継ぎや手順書整備にも貢献しやすい。`;
  return `変化への柔軟性が強み。新規プロジェクト・配置転換・季節変動のある業務で活躍。`;
}

/** 4 大エンジン用の施設アピールコメント */
function engineFacilityComment(label: string, score: number, original: string): string {
  const v = Math.floor(score);
  if (label === "総合パワー") {
    if (v >= 85) return `業務全般を高水準でこなす総合力。早期に主力戦力化が期待できます。`;
    if (v >= 75) return `業務全般に十分な遂行力。標準的な OJT で即戦力化します。`;
    return `業務遂行に必要な基礎力あり。経験を積むことでさらに伸びるタイプ。`;
  }
  if (label === "基礎力") {
    if (v >= 85) return `誠実さと継続力が高く、記録や引継ぎの精度に強み。指導役にも適性。`;
    if (v >= 75) return `安定したパフォーマンスを継続できる。多忙時も品質が落ちにくい。`;
    return `継続力は伸びしろあり。明確なルーティン設計があると安心して任せられます。`;
  }
  if (label === "実務力") {
    if (v >= 85) return `現場での実務遂行と判断スピードが高水準。多忙な現場で即戦力。`;
    if (v >= 75) return `実務をテンポよくこなせるタイプ。基本マニュアル整備があれば順応が早い。`;
    return `丁寧に積み上げるタイプ。ペースを尊重した OJT で力を発揮します。`;
  }
  // 頭脳力
  if (v >= 85) return `観察と分析で本質を捉える知性が高い。ケア計画立案・記録監査などで活躍。`;
  if (v >= 75) return `論理的な判断力あり。OJT で「なぜそうするか」を共有すると吸収が早い。`;
  return original;
}

/** 業態別の施設目線コメント (働く人の特性 + 施設として活かすポイント) */
function categoryFacilityComment(score: number, typeName: string): string {
  const v = Math.floor(score);
  if (v >= 85) {
    return `${typeName}の強みが最大限に活きる業態。配属直後から主力として活用可能。`;
  }
  if (v >= 75) {
    return `相性が良く、標準的な OJT で安定稼働。配属時に業務量の目安を伝えると安心。`;
  }
  if (v >= 65) {
    return `良好な相性。最初の 1〜2 ヶ月のオリエンテーションを丁寧に設計すると活きます。`;
  }
  if (v >= 55) {
    return `一定の適性あり。本人の伸びしろを活かす配属とフォロー体制があると効果的。`;
  }
  return `スタイルが少し離れる業態。事前面談で本人の希望と現場文化のすり合わせを推奨。`;
}

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

        <View style={styles.metaTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>候補者イニシャル</Text>
            <Text style={styles.metaValue}>{input.applicantInitials}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>キャリア・タイプ</Text>
            <Text style={styles.metaValue}>{d.typeCode} ({d.type.name})</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>タイプ特徴</Text>
            <Text style={styles.metaValue}>{d.type.catchphrase}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>保有資格</Text>
            <Text style={styles.metaValue}>{input.qualifications.join(" / ") || "—"}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>経験年数</Text>
            <Text style={styles.metaValue}>{input.experienceYears} 年</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>1. 4 大エンジン性能 (現場での力量)</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.th1}>指標</Text>
          <Text style={styles.th2}>点数</Text>
          <Text style={styles.th3}>ランク</Text>
          <Text style={styles.th4}>施設として活かすポイント</Text>
        </View>
        {[
          { label: "総合パワー", e: d.engines.totalPower },
          { label: "基礎力", e: d.engines.foundation },
          { label: "実務力", e: d.engines.execution },
          { label: "頭脳力", e: d.engines.intellect },
        ].map((row) => (
          <View key={row.label} style={styles.tableRow}>
            <Text style={styles.th1}>{row.label}</Text>
            <Text style={styles.th2}>{Math.floor(row.e.score)} 点</Text>
            <Text style={styles.th3}>{row.e.rank}</Text>
            <Text style={styles.th4}>{engineFacilityComment(row.label, row.e.score, row.e.comment)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>2. 候補者の特性 (4 軸スコア)</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.th1}>特性</Text>
          <Text style={styles.th2}>点数</Text>
          <Text style={styles.th3}> </Text>
          <Text style={styles.th4}>施設目線の活かし方</Text>
        </View>
        {([
          { key: "caring" as const, label: "共感力 (Caring)" },
          { key: "energetic" as const, label: "行動力 (Energetic)" },
          { key: "team" as const, label: "チーム志向 (Team)" },
          { key: "stable" as const, label: "安定性 (Stable)" },
        ]).map((row) => (
          <View key={row.key} style={styles.tableRow}>
            <Text style={styles.th1}>{row.label}</Text>
            <Text style={styles.th2}>{Math.floor(d.traits[row.key])} 点</Text>
            <Text style={styles.th3}> </Text>
            <Text style={styles.th4}>{traitFacilityComment(row.key, d.traits[row.key])}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>3. 業態別適性 (希望業態のみ)</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.th1}>業態</Text>
          <Text style={styles.th2}>点数</Text>
          <Text style={styles.th3}>ランク</Text>
          <Text style={styles.th4}>施設として配置するときのコメント</Text>
        </View>
        {d.desiredFit.map((f) => (
          <View key={f.category} style={styles.tableRow}>
            <Text style={styles.th1}>{CATEGORY_LABEL[f.category]}</Text>
            <Text style={styles.th2}>{Math.floor(f.score)} 点</Text>
            <Text style={styles.th3}>{f.rank}</Text>
            <Text style={styles.th4}>{categoryFacilityComment(f.score, d.type.name)}</Text>
          </View>
        ))}

        {d.hiddenFit.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>4. 隠れた適性 (希望外で相性が良い業態)</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.th1}>業態</Text>
              <Text style={styles.th2}>点数</Text>
              <Text style={styles.th3}>ランク</Text>
              <Text style={styles.th4}>提案コメント</Text>
            </View>
            {d.hiddenFit.map((f) => (
              <View key={f.category} style={styles.tableRow}>
                <Text style={styles.th1}>{CATEGORY_LABEL[f.category]}</Text>
                <Text style={styles.th2}>{Math.floor(f.score)} 点</Text>
                <Text style={styles.th3}>{f.rank}</Text>
                <Text style={styles.th4}>{categoryFacilityComment(f.score, d.type.name)}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.watchSection}>
          <Text style={styles.watchTitle}>5. 配置・運用時の留意点</Text>
          {d.watchPoints.map((w, i) => (
            <Text key={i} style={styles.watchItem}>・{w}</Text>
          ))}
          <Text style={styles.watchItem}>・初回 1 ヶ月の振り返り面談を必ず実施 (本人/現場の双方の認識すり合わせ)</Text>
          <Text style={styles.watchItem}>・3 ヶ月時点で配属業務量の妥当性を確認 (本タイプは抱え込みやすい傾向)</Text>
        </View>

        <View style={styles.note}>
          <Text style={{ fontWeight: 700, fontSize: 7.5, marginBottom: 2 }}>本レポートの位置づけ</Text>
          <Text>
            複数の心理学的フレームワーク (Big Five, DISC, RIASEC) を AI が統合判定した参考情報です。
            最終的な採用判断は、必ず本人面談と業務体験を組み合わせて行ってください。
            候補者の追加情報・修正情報があれば、紹介担当までお知らせください。
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Powered by Tsumugi — AI Care Type Diagnosis v2.0</Text>
        </View>
      </Page>
    </Document>,
  );
}
