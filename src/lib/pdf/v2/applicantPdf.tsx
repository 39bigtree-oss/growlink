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

const COLORS = {
  primary: "#1e3a8a",
  primaryLight: "#3b82f6",
  bg: "#f8fafc",
  yellow: "#fef3c7",
  yellowAccent: "#eab308",
  textMuted: "#64748b",
  textLabel: "#334155",
  border: "#e2e8f0",
  ringActive: "#1e3a8a",
  ringInactive: "#cbd5e1",
};

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: "NotoSansJP", fontSize: 8.5, color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 5,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: 700, color: COLORS.primary },
  date: { fontSize: 7.5, color: "#666" },

  // タイプ表示
  typeBox: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    padding: 8,
    borderRadius: 5,
    marginBottom: 7,
    gap: 10,
  },
  codeWrap: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    width: 78,
  },
  codeText: { color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: 2 },
  codeLabel: { color: "#cbd5e1", fontSize: 6.5, marginTop: 1 },
  typeNameWrap: { flex: 1 },
  typeName: { fontSize: 13, fontWeight: 700, marginBottom: 1 },
  typeEnglish: { fontSize: 8, color: "#475569", marginBottom: 3 },
  typeCatch: { fontSize: 8.5, color: COLORS.primary, fontWeight: 700, marginBottom: 3 },
  typeDescription: { fontSize: 8, color: COLORS.textMuted, lineHeight: 1.45 },

  // セクションタイトル
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: COLORS.primary,
    backgroundColor: COLORS.yellow,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 4,
    marginTop: 7,
  },

  // 4 軸 + 4 大エンジン (横並び)
  twoColumn: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  // 4 大エンジン表
  engineRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
  },
  engineLabel: { width: 56, color: COLORS.textLabel, fontSize: 8 },
  engineRank: { width: 22, textAlign: "center", fontWeight: 700, color: COLORS.primary },
  engineScore: { width: 42, textAlign: "right", fontSize: 8 },
  engineComment: { flex: 1, color: COLORS.textMuted, fontSize: 7.5, paddingLeft: 4 },

  // 4 軸プロファイル詳細
  traitRow: { marginBottom: 3 },
  traitHeader: { flexDirection: "row", alignItems: "center", marginBottom: 1 },
  traitName: { width: 42, fontSize: 8, color: COLORS.textLabel, fontWeight: 700 },
  traitScore: { width: 32, fontSize: 8, color: COLORS.primary, fontWeight: 700 },
  traitBar: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  traitBarFill: {
    height: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  traitComment: { fontSize: 7, color: COLORS.textMuted, paddingLeft: 4 },

  // 強み
  strengthRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  strengthNum: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.primary,
    color: "#fff",
    textAlign: "center",
    fontSize: 7,
    fontWeight: 700,
    borderRadius: 7,
    paddingTop: 2.5,
    marginRight: 6,
  },
  strengthText: { flex: 1, fontSize: 8.5, lineHeight: 1.5 },

  // 業態フィット
  fitRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: "flex-start",
  },
  fitLabel: { width: 95, fontSize: 8.5, fontWeight: 700 },
  fitScore: { width: 40, textAlign: "right", fontWeight: 700, fontSize: 8 },
  fitRank: { width: 20, textAlign: "center", color: COLORS.primary, fontWeight: 700 },
  fitComment: { flex: 1, fontSize: 7.5, color: COLORS.textMuted, paddingLeft: 4, lineHeight: 1.4 },

  // 隠れた適性ボックス
  hiddenBox: {
    marginTop: 4,
    backgroundColor: "#fef9c3",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.yellowAccent,
  },
  hiddenTitle: { fontSize: 7.5, fontWeight: 700, color: "#854d0e", marginBottom: 2 },

  // 同僚タイプ
  partnerBox: { flexDirection: "row", gap: 6, marginTop: 3 },
  partnerCard: {
    flex: 1,
    padding: 5,
    backgroundColor: "#eff6ff",
    borderRadius: 3,
  },
  partnerCode: { fontSize: 10, fontWeight: 700, color: COLORS.primary, letterSpacing: 1 },
  partnerName: { fontSize: 7.5, color: COLORS.textLabel, marginTop: 1 },

  summaryBox: {
    backgroundColor: COLORS.bg,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginTop: 4,
    fontSize: 7.5,
    lineHeight: 1.55,
  },
  watchBox: {
    backgroundColor: "#fef2f2",
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    fontSize: 7.5,
    marginTop: 4,
    lineHeight: 1.5,
  },
  watchTitle: { fontWeight: 700, marginBottom: 2, color: "#991b1b" },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 3,
  },
});

export type ApplicantPdfInput = {
  applicantFullName: string;
  generatedAt: Date;
  diagnosis: DiagnosisV2Result;
};

/** 4 軸レーダーチャート (SVG) */
function RadarChart({ traits }: { traits: { caring: number; energetic: number; team: number; stable: number } }) {
  const cx = 55;
  const cy = 55;
  const max = 48;

  const axes = [
    { v: traits.caring, angle: -90 },
    { v: traits.energetic, angle: 0 },
    { v: traits.stable, angle: 90 },
    { v: traits.team, angle: 180 },
  ];

  const points = axes
    .map((a) => {
      const r = (a.v / 100) * max;
      const rad = (a.angle * Math.PI) / 180;
      return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
    })
    .join(" ");

  return (
    <Svg width={110} height={110}>
      {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
        const r = max * ratio;
        const pts = axes
          .map((a) => {
            const rad = (a.angle * Math.PI) / 180;
            return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
          })
          .join(" ");
        return <Polygon key={i} points={pts} stroke={COLORS.border} strokeWidth={0.5} fill="none" />;
      })}
      {axes.map((a, i) => {
        const rad = (a.angle * Math.PI) / 180;
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + max * Math.cos(rad)}
            y2={cy + max * Math.sin(rad)}
            stroke={COLORS.ringInactive}
            strokeWidth={0.5}
          />
        );
      })}
      <Polygon points={points} fill={COLORS.primary} fillOpacity={0.3} stroke={COLORS.primary} strokeWidth={1.5} />
    </Svg>
  );
}

function traitComment(name: "caring" | "energetic" | "team" | "stable", score: number): string {
  const high = score >= 80;
  const mid = score >= 65 && score < 80;
  switch (name) {
    case "caring":
      return high
        ? "人の気持ちを察する力が高く、家族から深く信頼されます"
        : mid
          ? "場面に応じて柔らかく寄り添える共感性があります"
          : "理論や事実ベースで冷静に判断する強みがあります";
    case "energetic":
      return high
        ? "テンポよく動き、現場のリズムを作る原動力になります"
        : mid
          ? "必要な場面でしっかり動ける推進力を持っています"
          : "静かに観察し、考えてから動く慎重さがあります";
    case "team":
      return high
        ? "チームと協力するのが得意。連携の要として動けます"
        : mid
          ? "状況に応じて協調と独立を使い分けられます"
          : "単独でも自律的に判断・行動できる独立心があります";
    case "stable":
      return high
        ? "ぶれない継続力で長期ケアの土台を支えられます"
        : mid
          ? "落ち着いて業務を積み上げる安定感があります"
          : "変化やイレギュラーに柔軟に適応できます";
  }
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
            <Text style={styles.typeDescription}>{d.type.description}</Text>
          </View>
        </View>

        {/* 4 軸 (左) + 4 大エンジン (右) */}
        <View style={styles.twoColumn}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>4 軸プロファイル</Text>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
              <View style={{ width: 110 }}>
                <RadarChart traits={d.traits} />
              </View>
              <View style={{ flex: 1 }}>
                {([
                  { key: "caring", label: "共感" },
                  { key: "energetic", label: "行動" },
                  { key: "team", label: "チーム" },
                  { key: "stable", label: "安定" },
                ] as const).map((row) => {
                  const v = Math.floor(d.traits[row.key]);
                  return (
                    <View key={row.key} style={styles.traitRow}>
                      <View style={styles.traitHeader}>
                        <Text style={styles.traitName}>{row.label}</Text>
                        <Text style={styles.traitScore}>{v} 点</Text>
                        <View style={styles.traitBar}>
                          <View style={{ ...styles.traitBarFill, width: `${v}%` }} />
                        </View>
                      </View>
                      <Text style={styles.traitComment}>{traitComment(row.key, v)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
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
                <Text style={styles.engineScore}>{Math.floor(row.e.score)} 点</Text>
                <Text style={styles.engineComment}>{row.e.comment}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 強み TOP 3 */}
        <Text style={styles.sectionTitle}>あなたの 3 つの強み</Text>
        {d.strengths.slice(0, 3).map((s, i) => (
          <View key={i} style={styles.strengthRow}>
            <Text style={styles.strengthNum}>{i + 1}</Text>
            <Text style={styles.strengthText}>{s}</Text>
          </View>
        ))}

        {/* 業態フィット */}
        <Text style={styles.sectionTitle}>希望業態への適性</Text>
        {d.desiredFit.map((f) => (
          <View key={f.category} style={styles.fitRow}>
            <Text style={styles.fitLabel}>{CATEGORY_LABEL[f.category]}</Text>
            <Text style={styles.fitScore}>{Math.floor(f.score)} 点</Text>
            <Text style={styles.fitRank}>{f.rank}</Text>
            <Text style={styles.fitComment}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
          </View>
        ))}

        {d.hiddenFit.length > 0 ? (
          <View style={styles.hiddenBox}>
            <Text style={styles.hiddenTitle}>★ 隠れた適性 (意外と合うかもしれない業態)</Text>
            {d.hiddenFit.map((f) => (
              <View key={f.category} style={styles.fitRow}>
                <Text style={styles.fitLabel}>{CATEGORY_LABEL[f.category]}</Text>
                <Text style={styles.fitScore}>{Math.floor(f.score)} 点</Text>
                <Text style={styles.fitRank}>{f.rank}</Text>
                <Text style={styles.fitComment}>{f.comment.replace(/^[^:]+:\s*/, "")}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 相性の良い同僚 */}
        <Text style={styles.sectionTitle}>相性の良い同僚タイプ</Text>
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
            <Text style={styles.watchTitle}>大切にしてほしいポイント</Text>
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
