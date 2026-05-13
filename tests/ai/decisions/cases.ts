import type { ApplicantDiagnosisInput } from "@/lib/ai/diagnosis";

export type DiagnosisCase = {
  id: string; // golden ファイル名と一致させる
  description: string;
  applicant: ApplicantDiagnosisInput;
  gender: "MALE" | "FEMALE" | "OTHER";
};

/**
 * 全 case は完全に架空・匿名のテスト用データ。実在の名前・生年月日・連絡先を含めない。
 * テーブル/係数を変更したら `pnpm tsx tests/ai/decisions/generate-golden.ts` で再生成する。
 */
export const DIAGNOSIS_CASES: DiagnosisCase[] = [
  {
    id: "case01-standard-jp-nurse",
    description: "標準的な日本語姓名・看護師資格・訪問看護希望",
    applicant: {
      lastName: "山田",
      firstName: "花子",
      birthDate: "1990-04-12",
      qualifications: ["看護師", "認知症ケア専門士"],
      desiredCategories: ["HOMEVISIT_NURSE"],
    },
    gender: "FEMALE",
  },
  {
    id: "case02-short-name-careworker",
    description: "1 字姓 + 1 字名 / 介護福祉士 / 希望未選択",
    applicant: {
      lastName: "林",
      firstName: "葵",
      birthDate: "1985-09-20",
      qualifications: ["介護福祉士", "介護職員実務者研修"],
      desiredCategories: [],
    },
    gender: "MALE",
  },
  {
    id: "case03-long-jp-name",
    description: "3 字姓 + 3 字名 / PT 資格 / リハ希望",
    applicant: {
      lastName: "長谷川",
      firstName: "美智子",
      birthDate: "1978-12-01",
      qualifications: ["理学療法士"],
      desiredCategories: ["REHAB_DAY"],
    },
    gender: "FEMALE",
  },
  {
    id: "case04-roman-name-foreigner",
    description: "ローマ字表記の外国人風名 / 資格なし / 希望未選択 → 姓名判断中立化",
    applicant: {
      lastName: "Smith",
      firstName: "John",
      birthDate: "1995-01-15",
      qualifications: [],
      desiredCategories: [],
    },
    gender: "MALE",
  },
  {
    id: "case05-katakana-only",
    description: "カナのみ表記 / 介護初任者研修 / グループホーム希望",
    applicant: {
      lastName: "デラクルス",
      firstName: "マリア",
      birthDate: "1992-07-07",
      qualifications: ["介護職員初任者研修"],
      desiredCategories: ["GROUP_HOME_DISABILITY"],
    },
    gender: "FEMALE",
  },
  {
    id: "case06-master-number-lifepath",
    description: "Life Path 11 (マスター) に落ちる生年月日 / 看護師 / 急性期希望",
    applicant: {
      lastName: "佐藤",
      firstName: "健",
      birthDate: "1992-04-04", // 1+9+9+2 + 0+4 + 0+4 = 29 → 11 (マスター保持)
      qualifications: ["看護師"],
      desiredCategories: ["HOSPITAL_ACUTE"],
    },
    gender: "MALE",
  },
  {
    id: "case07-unmatched-qualification",
    description: "資格が業態と無関係 (社会福祉士のみ) / 希望は障害福祉",
    applicant: {
      lastName: "鈴木",
      firstName: "一郎",
      birthDate: "1970-11-30",
      qualifications: ["社会福祉士"],
      desiredCategories: ["DAYCARE_DISABILITY", "GROUP_HOME_DISABILITY"],
    },
    gender: "MALE",
  },
  {
    id: "case08-no-qualification-no-desire",
    description: "資格・希望ともに空 / 全業態で平均的なベースラインが出る想定",
    applicant: {
      lastName: "中村",
      firstName: "太郎",
      birthDate: "2000-01-01",
      qualifications: [],
      desiredCategories: [],
    },
    gender: "MALE",
  },
];
