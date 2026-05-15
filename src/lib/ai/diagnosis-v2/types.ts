/**
 * v2.0 ケアタイプ診断 — 4 軸 × 2 値で 16 タイプを判定。
 *
 * 設計判断:
 *   - MBTI 風 4 文字コード (例: CETS) で覚えやすさ + シェア性を担保
 *   - 各軸を 0-100 でスコア化、50 を閾値に 2 値化してコード生成
 *   - 4 軸は医療福祉現場で意味のあるものに厳選 (Big Five + DISC を医療福祉版にアレンジ)
 *
 * 4 軸:
 *   - C (Caring 共感) ⟷ A (Analytical 分析)
 *   - E (Energetic 行動) ⟷ R (Reflective 内省)
 *   - T (Team チーム) ⟷ I (Independent 単独)
 *   - S (Stable 安定) ⟷ F (Flexible 柔軟)
 */

export type AxisLetter = "C" | "A" | "E" | "R" | "T" | "I" | "S" | "F";
export type TypeCode = string; // 4 文字 (例: "CETS")

/** 8 軸スコア (0-100)。両端の値は補完関係 (C 高 = A 低)。 */
export type TraitScores = {
  /** 共感性 (高いほど C 寄り) */
  caring: number;
  /** 行動性 (高いほど E 寄り) */
  energetic: number;
  /** チーム志向 (高いほど T 寄り) */
  team: number;
  /** 安定性 (高いほど S 寄り) */
  stable: number;
};

/** スコアから 4 文字コードを生成。50 を境界とする。 */
export function codeFromScores(scores: TraitScores): TypeCode {
  const c = scores.caring >= 50 ? "C" : "A";
  const e = scores.energetic >= 50 ? "E" : "R";
  const t = scores.team >= 50 ? "T" : "I";
  const s = scores.stable >= 50 ? "S" : "F";
  return `${c}${e}${t}${s}`;
}

export type CareType = {
  code: TypeCode;
  name: string; // 日本語タイプ名
  english: string; // 英語タイトル
  catchphrase: string; // 1 行キャッチコピー
  description: string; // タイプ全体像
  strengthThemes: string[]; // 強みのテーマ (3 つ)
  watchPoints: string[]; // 気をつけたいポイント (1-2 つ)
  bestFitJobs: string[]; // 特に輝く業態 (3 つまで)
  /** 相性の良い同僚タイプの 4 文字コード (2 つ) */
  partners: TypeCode[];
};

/**
 * 16 タイプ定義。
 * 各タイプは医療福祉現場での働き方として意味のある特徴を表す。
 */
export const CARE_TYPES: Record<TypeCode, CareType> = {
  CETS: {
    code: "CETS",
    name: "現場の調和者",
    english: "The Field Harmonizer",
    catchphrase: "穏やかさでチームを束ね、利用者と家族を包む",
    description:
      "共感と継続を強みに、チームの空気を整えながら現場を支えるタイプ。患者・利用者の感情を受け止め、ご家族からの信頼を集めやすい。",
    strengthThemes: [
      "ご家族の感情を受け止めながら冷静に対応できる",
      "新人の不安を察して、聞かれる前にフォローに回れる",
      "夜勤明けでも記録の精度が落ちない誠実さ",
    ],
    watchPoints: ["抱え込みやすい傾向。相談ルートを早めに設計を"],
    bestFitJobs: ["訪問看護", "グループホーム", "緩和ケア"],
    partners: ["AETS", "CRTS"],
  },
  CETF: {
    code: "CETF",
    name: "共感の駆け抜け役",
    english: "The Empathic Sprinter",
    catchphrase: "人の気持ちに寄り添いながら、機敏に動く",
    description:
      "共感とスピードを併せ持ち、変化の多い現場で利用者の不安を即座に和らげるタイプ。チームメンバーの感情変化にも敏感。",
    strengthThemes: [
      "急変時にも利用者の不安を即座に和らげる声かけ",
      "新人や見学者の戸惑いを瞬時に察知して動ける",
      "情報共有が早く、申し送りで漏れがない",
    ],
    watchPoints: ["速さを優先しがち。記録の整合性を意識しよう"],
    bestFitJobs: ["デイサービス", "外来クリニック", "急性期病院"],
    partners: ["AETS", "CRTF"],
  },
  CEIS: {
    code: "CEIS",
    name: "信頼の単独行動者",
    english: "The Trusted Lone Caregiver",
    catchphrase: "一人でも、利用者一人ひとりと深く向き合う",
    description:
      "共感力と行動力を持ちながら、単独行動でも力を発揮するタイプ。訪問先で利用者・家族と一対一で深い関係を築く。",
    strengthThemes: [
      "訪問先で利用者ごとに最適なケアを即決できる",
      "ご家族の細かな相談にも一対一で寄り添える",
      "判断のブレが少なく、安心感を与える",
    ],
    watchPoints: ["孤立しがち。チームへの相談タイミングを意識を"],
    bestFitJobs: ["訪問看護", "訪問介護", "訪問看護(精神科)"],
    partners: ["AETS", "ARIS"],
  },
  CEIF: {
    code: "CEIF",
    name: "現場の即応職人",
    english: "The Hands-On Responder",
    catchphrase: "現場の状況に応じて、その場で最善手を打つ",
    description:
      "共感と行動を併せ持ち、柔軟に動くタイプ。マニュアル外の状況でも臨機応変に判断し、利用者・家族に合わせたケアを行う。",
    strengthThemes: [
      "予測外の状況でも利用者目線で動ける",
      "ご家族の個別事情に合わせた配慮ができる",
      "現場の小さな変化に素早く対応できる",
    ],
    watchPoints: ["即応優先で記録が後回しになりがち"],
    bestFitJobs: ["訪問看護", "訪問介護", "クリニック"],
    partners: ["ARTS", "AETS"],
  },
  CRTS: {
    code: "CRTS",
    name: "静謐の伴走者",
    english: "The Quiet Companion",
    catchphrase: "静かに観察し、必要なときに寄り添う",
    description:
      "共感と内省を併せ持ち、チームに溶け込みながら継続して支えるタイプ。長期ケアに強く、利用者の小さな変化を見逃さない。",
    strengthThemes: [
      "長期ケアで利用者の微細な変化を察知できる",
      "新人のメンタル不調を早期に発見できる",
      "ご家族との対話で深い信頼を築く",
    ],
    watchPoints: ["静かすぎて意見が通らない場面に注意"],
    bestFitJobs: ["グループホーム", "緩和ケア", "訪問看護(精神科)"],
    partners: ["AETS", "CETS"],
  },
  CRTF: {
    code: "CRTF",
    name: "柔らぎの観察者",
    english: "The Gentle Observer",
    catchphrase: "穏やかに見守り、必要に応じて柔軟に動く",
    description:
      "共感と内省を持ちながら、柔軟性も併せ持つタイプ。チームに溶け込みつつ、変化のある現場でも穏やかに対応できる。",
    strengthThemes: [
      "利用者一人ひとりの性格に合わせた声かけができる",
      "難しい家族との関係性にも柔らかく接する",
      "変化のある現場でも落ち着いて立ち振る舞う",
    ],
    watchPoints: ["優柔不断に見られがち。意思表示を明確に"],
    bestFitJobs: ["デイサービス", "障害者デイ", "リハビリ"],
    partners: ["AETF", "CETF"],
  },
  CRIS: {
    code: "CRIS",
    name: "深く向き合う守人",
    english: "The Deep Guardian",
    catchphrase: "一人で利用者と深く向き合い、長く支える",
    description:
      "内省的で単独行動を好むが、共感力は高いタイプ。一対一の深い関係性で長期的に利用者を支える。",
    strengthThemes: [
      "利用者の生活背景を深く理解しケアに活かす",
      "信頼関係を年単位で積み上げる",
      "繊細な変化を見逃さない観察力",
    ],
    watchPoints: ["チーム連携の機会を意識的に作ろう"],
    bestFitJobs: ["訪問看護(精神科)", "訪問介護", "グループホーム"],
    partners: ["AETS", "CETS"],
  },
  CRIF: {
    code: "CRIF",
    name: "心の機微を読む人",
    english: "The Subtle Reader",
    catchphrase: "心の小さな変化に気づき、柔らかく寄り添う",
    description:
      "内省的で柔軟、共感力の高いタイプ。利用者・家族の言葉にしない感情を察知して、状況に応じた対応ができる。",
    strengthThemes: [
      "利用者の言葉にしない感情に気づける",
      "場面ごとに最適なペースを選び取れる",
      "難しい家族関係でも橋渡しができる",
    ],
    watchPoints: ["集団での意見表明を意識的に"],
    bestFitJobs: ["訪問看護(精神科)", "緩和ケア", "障害者訪問介護"],
    partners: ["AETF", "CETF"],
  },
  AETS: {
    code: "AETS",
    name: "戦略の現場リーダー",
    english: "The Tactical Leader",
    catchphrase: "冷静な分析でチームを引っ張る",
    description:
      "分析力と行動力を併せ持つチームリーダー型。データと観察に基づいて判断し、チームを成果に導く。",
    strengthThemes: [
      "数値と現場の両面から判断を下せる",
      "新人指導で「なぜそうするか」を論理的に説明できる",
      "緊急時にも冷静に優先順位を整理できる",
    ],
    watchPoints: ["効率優先で感情への配慮を忘れないように"],
    bestFitJobs: ["急性期病院", "総合病院", "リハビリ"],
    partners: ["CETS", "CRTS"],
  },
  AETF: {
    code: "AETF",
    name: "変化を生む推進者",
    english: "The Change Driver",
    catchphrase: "分析と行動で組織を前進させる",
    description:
      "分析力・行動力・柔軟性を併せ持つ変革推進型。新しい仕組みやプロセスを導入し、チームを進化させる。",
    strengthThemes: [
      "既存のやり方に縛られない発想ができる",
      "新しい記録システムやツールを率先して導入する",
      "業務改善のアイデアを実行に移せる",
    ],
    watchPoints: ["変化を急ぎすぎて周囲が追いつけない場面に注意"],
    bestFitJobs: ["総合病院", "クリニック", "デイサービス"],
    partners: ["CRTS", "CETF"],
  },
  AEIS: {
    code: "AEIS",
    name: "独走の実務家",
    english: "The Independent Expert",
    catchphrase: "分析力と行動力で、一人でも結果を出す",
    description:
      "分析的かつ行動的で、単独でも安定して成果を出すタイプ。専門性を磨き、独立した判断ができる。",
    strengthThemes: [
      "専門知識を深く積み上げる",
      "一人体制の現場でも自律的に動ける",
      "緊急時の判断が早く的確",
    ],
    watchPoints: ["独走しすぎると孤立に。情報共有を意識"],
    bestFitJobs: ["訪問看護", "在宅医療", "クリニック"],
    partners: ["CETS", "CETF"],
  },
  AEIF: {
    code: "AEIF",
    name: "果断の開拓者",
    english: "The Pioneer",
    catchphrase: "新しい現場を切り拓く即断即決",
    description:
      "分析・行動・単独・柔軟を併せ持つ開拓者型。新規部門の立ち上げや、変化の激しい環境で力を発揮する。",
    strengthThemes: [
      "新規事業所の立ち上げをリードできる",
      "前例のない判断を恐れず下せる",
      "失敗を学びに変える吸収力",
    ],
    watchPoints: ["前のめりすぎて手順を飛ばさないように"],
    bestFitJobs: ["訪問看護(立ち上げ期)", "急性期病院", "リハビリ"],
    partners: ["CRTS", "CRTF"],
  },
  ARTS: {
    code: "ARTS",
    name: "深考の分析者",
    english: "The Deep Analyst",
    catchphrase: "じっくり観察し、最適解を導く",
    description:
      "分析的で内省的、チーム志向で安定型。データや事例を深く分析し、長期的な視点で最善のケアを設計する。",
    strengthThemes: [
      "事例分析で改善ポイントを発見できる",
      "ケア計画を緻密に立案できる",
      "新人教育で論理的な指導ができる",
    ],
    watchPoints: ["分析に時間をかけすぎず実行に移す勇気を"],
    bestFitJobs: ["総合病院", "リハビリ", "ケアマネージャー職"],
    partners: ["CETF", "CETS"],
  },
  ARTF: {
    code: "ARTF",
    name: "知性の調整役",
    english: "The Insightful Coordinator",
    catchphrase: "知性で複雑な関係を整理する",
    description:
      "分析的で柔軟、チーム志向のコーディネーター型。多職種連携や複雑な利害調整で力を発揮する。",
    strengthThemes: [
      "多職種の意見を整理して全体像を作れる",
      "複雑な家族関係の調整ができる",
      "矛盾する情報を冷静に判別できる",
    ],
    watchPoints: ["八方美人にならないよう、立場を明確に"],
    bestFitJobs: ["総合病院", "クリニック", "ケアマネージャー職"],
    partners: ["CETS", "CETF"],
  },
  ARIS: {
    code: "ARIS",
    name: "静謐の専門家",
    english: "The Silent Specialist",
    catchphrase: "深い専門性を一人で磨き続ける",
    description:
      "分析的・内省的・単独・安定型。特定領域の専門性を深く磨き、安定して質の高いケアを提供する。",
    strengthThemes: [
      "特定領域(精神科・緩和等)の専門性が深い",
      "記録の精密さで多職種から信頼される",
      "感情に流されず判断ができる",
    ],
    watchPoints: ["孤独感を感じやすい。研修や勉強会への参加を"],
    bestFitJobs: ["訪問看護(精神科)", "緩和ケア", "障害者訪問介護"],
    partners: ["CETS", "CETF"],
  },
  ARIF: {
    code: "ARIF",
    name: "観の指揮者",
    english: "The Insight Conductor",
    catchphrase: "観察と柔軟性で、最適な選択を導く",
    description:
      "分析的・内省的・単独・柔軟型。観察と思考の両面から、状況に応じた最適解を選び取る。",
    strengthThemes: [
      "前例のない状況でも観察から最適解を導ける",
      "利用者ごとに異なるニーズを正確に捉える",
      "判断に時間をかけすぎず行動に移せる",
    ],
    watchPoints: ["完璧を求めすぎない柔軟さも大切に"],
    bestFitJobs: ["訪問看護", "緩和ケア", "リハビリ"],
    partners: ["CETF", "CETS"],
  },
};

/** 4 文字コードからタイプを取得。未登録なら fallback CETS。 */
export function getCareType(code: TypeCode): CareType {
  return CARE_TYPES[code] ?? CARE_TYPES.CETS;
}

/** 全 16 コードを取得。 */
export function allCodes(): TypeCode[] {
  return Object.keys(CARE_TYPES);
}
