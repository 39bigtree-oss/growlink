/**
 * スキル / 資格の階層 (subsumption) マッチ。
 *
 * 「看護師」を求める案件に対し:
 *   - "看護師" 保持者 → 完全マッチ
 *   - "認定看護師" / "専門看護師" 保持者 → 上位資格としてマッチ
 *   - "准看護師" のみ保持 → マッチしない (下位資格)
 *
 * 単純な完全一致では取りこぼす実運用ケースをカバー。
 *
 * 仕様データは src/lib/matching/skill-hierarchy.ts に集約 (Single Source)。
 * v1.9 で公式の O*NET 風タクソノミーに置換予定。
 */

/**
 * 各キー (要件) に対して、それを「満たす」と見なせる資格名のリスト (自分自身を含む)。
 * 上位資格 ⊃ 下位資格 の関係を Set 形式で表現。
 */
export const SKILL_SUBSUMPTION: Record<string, string[]> = {
  看護師: ["看護師", "認定看護師", "専門看護師", "助産師", "保健師"],
  准看護師: ["准看護師", "看護師", "認定看護師", "専門看護師", "保健師", "助産師"],
  介護福祉士: ["介護福祉士", "ケアマネージャー", "社会福祉士"],
  介護職員初任者研修: [
    "介護職員初任者研修",
    "介護職員実務者研修",
    "介護福祉士",
    "ケアマネージャー",
  ],
  介護職員実務者研修: ["介護職員実務者研修", "介護福祉士", "ケアマネージャー"],
  理学療法士: ["理学療法士"],
  作業療法士: ["作業療法士"],
  言語聴覚士: ["言語聴覚士"],
  社会福祉士: ["社会福祉士"],
  精神保健福祉士: ["精神保健福祉士", "社会福祉士"],
  ケアマネージャー: ["ケアマネージャー"],
  認知症ケア専門士: ["認知症ケア専門士"],
};

/**
 * 必要資格 `required` を `held` (求職者が持つ資格集合) が満たすか判定。
 * 階層的に「上位資格保持」もマッチとして許容する。
 *
 * 不明な required 文字列 (SKILL_SUBSUMPTION に登録されていない) は
 * 文字列完全一致にフォールバック。
 */
export function isQualificationMet(required: string, held: string[]): boolean {
  const acceptable = SKILL_SUBSUMPTION[required];
  if (!acceptable) {
    return held.includes(required);
  }
  return held.some((q) => acceptable.includes(q));
}

/**
 * 全必須資格を満たすか? 1 つでも欠ければ false。
 */
export function allQualificationsMet(required: string[], held: string[]): {
  ok: boolean;
  missing: string[];
} {
  const missing = required.filter((r) => !isQualificationMet(r, held));
  return { ok: missing.length === 0, missing };
}
