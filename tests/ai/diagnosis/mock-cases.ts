import type { ApplicantDiagnosisInput } from "@/lib/ai/diagnosis";

export type MockProviderCase = {
  id: string;
  description: string;
  applicant: ApplicantDiagnosisInput;
  gender: "MALE" | "FEMALE" | "OTHER";
};

export const MOCK_PROVIDER_CASES: MockProviderCase[] = [
  {
    id: "case01-standard-nurse",
    description: "看護師 / 訪問看護希望 → 上位カテゴリで S/A、下位で C 程度",
    applicant: {
      lastName: "山田",
      firstName: "花子",
      birthDate: "1990-04-12",
      qualifications: ["看護師"],
      desiredCategories: ["HOMEVISIT_NURSE"],
    },
    gender: "FEMALE",
  },
  {
    id: "case02-careworker-no-desire",
    description: "介護福祉士 / 希望未選択 → 訪問介護とデイで点数高め",
    applicant: {
      lastName: "佐藤",
      firstName: "健",
      birthDate: "1985-09-20",
      qualifications: ["介護福祉士", "介護職員実務者研修"],
      desiredCategories: [],
    },
    gender: "MALE",
  },
  {
    id: "case03-foreign-no-qualification",
    description: "ローマ字名 / 資格なし → 姓名判断中立 + 資格 floor",
    applicant: {
      lastName: "Smith",
      firstName: "John",
      birthDate: "1995-01-15",
      qualifications: [],
      desiredCategories: ["DAYCARE_ELDERLY"],
    },
    gender: "MALE",
  },
];
