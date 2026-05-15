import "server-only";

import path from "node:path";
import React from "react";

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Svg,
  Polygon,
  Line,
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
    console.warn("[v2 applicant pdf] font register failed", err);
  }
}

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "NotoSansJP", fontSize: 9, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 6,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: 700, color: "#1e3a8a" },
  date: { fontSize: 8, color: "#666" },
  typeBox: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    gap: 12,
  },
  codeWrap: {
    backgroundColor: "#1e3a8a",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    width: 90,
  },
  codeText: { color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: 2 },
  codeLabel: { color: "#cbd5e1", fontSize: 7, marginTop: 2 },
  typeNameWrap: { flex: 1 },
  typeName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  typeEnglish: { fontSize: 9, color: "#475569", fontStyle: "italic", marginBottom: 4 },
  typeCatch: { fontSize: 9, color: "#1e3a8a" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1e3a8a",
    backgroundColor: "#fef3c7",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 4,
    marginTop: 8,
  },
  twoColumn: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  engineRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  engineLabel: { width: 70, color: "#334155" },
  engineRank: { width: 30, textAlign: "center", fontWeight: 700 },
  engineScore: { width: 30, textAlign: "right" },
  engineComment: { flex: 1, color: "#64748b", fontSize: 8 },
  strengthRow: { flexDirection: "row", marginBottom: 3 },
  strengthNum: {
    width: 16,
    height: 16,
    backgroundColor: "#1e3a8a",
    color: "#fff",
    textAlign: "center",
    fontSize: 8,
    fontWeight: 700,
    borderRadius: 8,
    paddingTop: 3,
    marginRight: 6,
  },
  strengthText: { flex: 1, fontSize: 9 },
  fitRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  fitLabel: { flex: 1, fontSize: 9 },
  fitScore: { width: 30, textAlign: "right", fontWeight: 700 },
  fitRank: { width: 24, textAlign: "center" },
  fitComment: { flex: 2, fontSize: 8, color: "#64748b" },
  hiddenBox: {
    marginTop: 4,
    backgroundColor: "#fef9c3",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#eab308",
  },
  hiddenTitle: { fontSize: 8, fontWeight: 700, color: "#854d0e", marginBottom: 3 },
  partnerBox: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  partnerCard: {
    flex: 1,
    padding: 5,
    backgroundColor: "#eff6ff",
    borderRadius: 3,
  },
  partnerCode: { fontSize: 10, fontWeight: 700, color: "#1e3a8a" },
  partnerName: { fontSize: 8, color: "#475569" },
  summaryBox: {
    backgroundColor: "#f8fafc",
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#1e3a8a",
    marginTop: 4,
    fontSize: 8,
    lineHeight: 1.5,
  },
  watchBox: {
    backgroundColor: "#fef2f2",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    fontSize: 8,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
  },
});

export type ApplicantPdfInput = {
  applicantFullName: string;
  generatedAt: Date;
  diagnosis: DiagnosisV2Result;
};

/** 4 軸レーダーチャート (SVG) */
function RadarChart({ traits }: { traits: { caring: number; energetic: number; team: number; stable: number } }) {
  const cx = 60;
  const cy = 60;
  const max = 50; // 半径

  const axes = [
    { label: "共感", v: traits.caring, angle: -90 },
    { label: "行動", v: traits.energetic, angle: 0 },
    { label: "安定", v: traits.stable, angle: 90 },
    { label: "チーム", v: traits.team, angle: 180 },
  ];

  const points = axes
    .map((a) => {
      const r = (a.v / 100) * max;
      const rad = (a.angle * Math.PI) / 180;
      return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
    })
    .join(" ");

  return (
    <Svg width={120} height={120}>
      {/* グリッド */}
      {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const r = max * ratio;
        const pts = axes
          .map((a) => {
            const rad = (a.angle * Math.PI) / 180;
            return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
          })
          .join(" ");
        return <Polygon key={i} points={pts} stroke="#e2e8f0" strokeWidth={0.5} fill="none" />;
      })}
      {/* 軸線 */}
      {axes.map((a, i) => {
        const rad = (a.angle * Math.PI) / 180;
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + max * Math.cos(rad)}
            y2={cy + max * Math.sin(rad)}
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
        );
      })}
      {/* データ */}
      <Polygon points={points} fill="#1e3a8a" fillOpacity={0.3} stroke="#1e3a8a" strokeWidth={1.5} />
    </Svg>
  );
}

export async function renderApplicantDiagnosisPdf(input: ApplicantPdfInput): Promise<Buffer> {
  ensureFont();
  const d = input.diagnosis;
  return renderToBuffer(
    <Document title={`${input.applicantFullName} 様のキャリア診断`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>〜 {input.applicantFullName} 様の AI キャリア診断 〜</Text>
          <Text style={styles.date}>{input.generatedAt.toISOString().slice(0, 10)}</Text>
        </View>

        {/* タイプ */}
        <View style={styles.typeBox}>
          <View style={styles.codeWrap}>
            <Text style={styles.codeText}>{d.typeCode}</Text>
            <Text style={styles.codeLabel}>あなたのコード</Text>
          </View>
          <View style={styles.typeNameWrap}>
            <Text style={styles.typeName}>{d.type.name}</Text>
            <Text style={styles.typeEnglish}>{d.type.english}</Text>
            <Text style={styles.typeCatch}>「{d.type.catchphrase}」</Text>
          </View>
        </View>

        {/* レーダー + エンジン (2 カラム) */}
        <View style={styles.twoColumn}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>4 軸プロファイル</Text>
            <View style={{ alignItems: "center" }}>
              <RadarChart traits={d.traits} />
            </View>
            <Text style={{ fontSize: 7, color: "#64748b", textAlign: "center", marginTop: 2 }}>
              共感 {d.traits.caring}/100  行動 {d.traits.energetic}/100  安定 {d.traits.stable}/100  チーム {d.traits.team}/100
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>4 大エンジン性能</Text>
            {[
              { label: "総合パワー", e: d.engines.totalPower },
              { label: "基礎力", e: d.engines.foundation },
              { label: "実務力", e: d.engines.execution },
              { label: "頭脳力", e: d.engines.intellect },
            ].map((row) => (
              <View key={row.label} style={styles.engineRow}>
                <Text style={styles.engineLabel}>{row.label}</Text>
                <Text style={styles.engineRank}>{row.e.rank}</Text>
                <Text style={styles.engineScore}>{row.e.score}</Text>
                <Text style={styles.engineComment}> </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 強み TOP 3 */}
        <Text style={styles.sectionTitle}>💎 あなたの 3 つの強み</Text>
        {d.strengths.slice(0, 3).map((s, i) => (
          <View key={i} style={styles.strengthRow}>
            <Text style={styles.strengthNum}>{i + 1}</Text>
            <Text style={styles.strengthText}>{s}</Text>
          </View>
        ))}

        {/* 業態フィット */}
        <Text style={styles.sectionTitle}>🏥 希望業態への適性</Text>
        {d.desiredFit.map((f) => (
          <View key={f.category} style={styles.fitRow}>
            <Text style={styles.fitLabel}>{CATEGORY_LABEL[f.category]}</Text>
            <Text style={styles.fitScore}>{f.score}</Text>
            <Text style={styles.fitRank}>{f.rank}</Text>
            <Text style={styles.fitComment}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
          </View>
        ))}

        {d.hiddenFit.length > 0 ? (
          <View style={styles.hiddenBox}>
            <Text style={styles.hiddenTitle}>⭐ 隠れた適性 (意外と合うかもしれない業態)</Text>
            {d.hiddenFit.map((f) => (
              <View key={f.category} style={styles.fitRow}>
                <Text style={styles.fitLabel}>{CATEGORY_LABEL[f.category]}</Text>
                <Text style={styles.fitScore}>{f.score}</Text>
                <Text style={styles.fitRank}>{f.rank}</Text>
                <Text style={styles.fitComment}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 相性の良い同僚 */}
        <Text style={styles.sectionTitle}>🤝 相性の良い同僚タイプ</Text>
        <View style={styles.partnerBox}>
          {d.partners.map((p) => (
            <View key={p.code} style={styles.partnerCard}>
              <Text style={styles.partnerCode}>{p.code}</Text>
              <Text style={styles.partnerName}>{p.name}</Text>
            </View>
          ))}
        </View>

        {/* 気をつけたい */}
        {d.watchPoints.length > 0 ? (
          <View style={styles.watchBox}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>💡 大切にしてほしいポイント</Text>
            {d.watchPoints.map((w, i) => (
              <Text key={i}>・{w}</Text>
            ))}
          </View>
        ) : null}

        {/* 総評 */}
        <View style={styles.summaryBox}>
          <Text>{d.summary}</Text>
        </View>

        <View style={styles.footer}>
          <Text>※ 本診断は参考目安です。最終的な就業選択は本人と紹介担当の対話で決定してください。</Text>
          <Text>Powered by Tsumugi</Text>
        </View>
      </Page>
    </Document>,
  );
}
