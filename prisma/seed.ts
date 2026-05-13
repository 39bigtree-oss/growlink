/**
 * 開発・E2E 用のシードデータ。
 *
 * 含まれる氏名・連絡先はすべて完全に架空の匿名化データ（実在しないアドレス）であり、
 * 本番データを取り込んではいけない。tests/fixtures/anonymized/ と同じ方針で扱う。
 */
import {
  ApplicantStatus,
  FacilityCategory,
  Gender,
  PrismaClient,
  Rank,
  StaffRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@growlink.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "growlink-admin-pass";

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: "Growlink Admin",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const staff = await prisma.staff.upsert({
    where: { userId: user.id },
    update: { email: adminEmail, name: "Growlink Admin", role: StaffRole.ADMIN },
    create: {
      userId: user.id,
      email: adminEmail,
      name: "Growlink Admin",
      role: StaffRole.ADMIN,
    },
  });

  console.log(`Seeded admin user: ${adminEmail}`);
  return { user, staff };
}

async function seedApplicants() {
  // すべて架空データ。NG: 実名 / 実電話 / 実住所
  const applicant1 = await prisma.applicant.upsert({
    where: { email: "anon-nurse-001@example.test" },
    update: {},
    create: {
      lastName: "テスト",
      firstName: "花子",
      lastNameKana: "テスト",
      firstNameKana: "ハナコ",
      birthDate: new Date("1990-04-12"),
      gender: Gender.FEMALE,
      email: "anon-nurse-001@example.test",
      phone: "+81-90-0000-0001",
      language: "ja",
      wantsDiagnosis: true,
      status: ApplicantStatus.DIAGNOSED,
      qualifications: {
        create: [
          { name: "看護師", acquiredOn: new Date("2013-04-01") },
          { name: "認知症ケア専門士", acquiredOn: new Date("2019-10-01") },
        ],
      },
    },
  });

  const applicant2 = await prisma.applicant.upsert({
    where: { email: "anon-careworker-002@example.test" },
    update: {},
    create: {
      lastName: "サンプル",
      firstName: "太郎",
      lastNameKana: "サンプル",
      firstNameKana: "タロウ",
      birthDate: new Date("1985-09-20"),
      gender: Gender.MALE,
      email: "anon-careworker-002@example.test",
      phone: "+81-90-0000-0002",
      language: "ja",
      wantsDiagnosis: true,
      status: ApplicantStatus.SKILL_SHEET_DONE,
      qualifications: {
        create: [{ name: "介護福祉士", acquiredOn: new Date("2012-04-01") }],
      },
    },
  });

  const applicant3 = await prisma.applicant.upsert({
    where: { email: "anon-foreign-003@example.test" },
    update: {},
    create: {
      lastName: "Dummy",
      firstName: "Maria",
      lastNameKana: "ダミー",
      firstNameKana: "マリア",
      birthDate: new Date("1995-01-15"),
      gender: Gender.FEMALE,
      email: "anon-foreign-003@example.test",
      phone: "+81-90-0000-0003",
      nationality: "PH",
      language: "en",
      wantsDiagnosis: false,
      status: ApplicantStatus.RECEIVED,
    },
  });

  // Phase 1-6 のダッシュボード / 一覧画面の見栄えを確保するため、
  // ステータスごとに分散した架空申込を追加で 12 件投入する。
  const additional = [
    { last: "中野", first: "葵", kana: ["ナカノ", "アオイ"], status: ApplicantStatus.INTERVIEW_DONE, q: ["看護師"], dc: ["HOMEVISIT_NURSE"] },
    { last: "斎藤", first: "美咲", kana: ["サイトウ", "ミサキ"], status: ApplicantStatus.SALES_READY, q: ["看護師", "保健師"], dc: ["HOSPITAL_GENERAL"] },
    { last: "鈴木", first: "一郎", kana: ["スズキ", "イチロウ"], status: ApplicantStatus.IN_INTRODUCTION, q: ["介護福祉士"], dc: ["DAYCARE_ELDERLY"] },
    { last: "高橋", first: "あかね", kana: ["タカハシ", "アカネ"], status: ApplicantStatus.CONTRACTED, q: ["看護師"], dc: ["HOMEVISIT_NURSE_PSYCHIATRY"] },
    { last: "井上", first: "翔", kana: ["イノウエ", "ショウ"], status: ApplicantStatus.REJECTED, q: [], dc: [] },
    { last: "松本", first: "智子", kana: ["マツモト", "トモコ"], status: ApplicantStatus.RECEIVED, q: ["介護職員初任者研修"], dc: ["HOMEVISIT_CARE"] },
    { last: "小林", first: "拓也", kana: ["コバヤシ", "タクヤ"], status: ApplicantStatus.RECEIVED, q: ["介護福祉士"], dc: ["GROUP_HOME_DISABILITY"] },
    { last: "森田", first: "由美", kana: ["モリタ", "ユミ"], status: ApplicantStatus.DIAGNOSED, q: ["看護師"], dc: ["CLINIC"] },
    { last: "藤井", first: "和也", kana: ["フジイ", "カズヤ"], status: ApplicantStatus.SKILL_SHEET_INPROGRESS, q: ["理学療法士"], dc: ["REHAB_DAY"] },
    { last: "岡本", first: "麗", kana: ["オカモト", "レイ"], status: ApplicantStatus.SKILL_SHEET_DONE, q: ["看護師"], dc: ["HOSPITAL_ACUTE"] },
    { last: "中村", first: "結衣", kana: ["ナカムラ", "ユイ"], status: ApplicantStatus.DIAGNOSED, q: ["作業療法士"], dc: ["REHAB_DAY", "HOSPITAL_GENERAL"] },
    { last: "渡辺", first: "健太", kana: ["ワタナベ", "ケンタ"], status: ApplicantStatus.INTERVIEW_DONE, q: ["介護福祉士", "介護職員実務者研修"], dc: ["HOMEVISIT_CARE", "DAYCARE_ELDERLY"] },
  ];
  const now = new Date();
  for (let i = 0; i < additional.length; i++) {
    const a = additional[i];
    const created = new Date(now.getTime() - i * 86_400_000); // 1 日ずつ過去にずらす
    const email = `anon-bulk-${String(i + 4).padStart(3, "0")}@example.test`;
    await prisma.applicant.upsert({
      where: { email },
      update: {},
      create: {
        lastName: a.last,
        firstName: a.first,
        lastNameKana: a.kana[0],
        firstNameKana: a.kana[1],
        birthDate: new Date(`19${70 + (i % 25)}-0${(i % 9) + 1}-15`),
        gender: i % 3 === 0 ? Gender.MALE : Gender.FEMALE,
        email,
        phone: `+81-90-0000-1${String(100 + i).slice(-3)}`,
        language: "ja",
        wantsDiagnosis: a.status !== ApplicantStatus.REJECTED,
        status: a.status,
        desiredCategories: a.dc as never,
        createdAt: created,
        qualifications: { create: a.q.map((n) => ({ name: n })) },
      },
    });
  }

  return { applicant1, applicant2, applicant3 };
}

async function seedDiagnoses(applicantId: string) {
  const rows = [
    {
      category: FacilityCategory.HOMEVISIT_NURSE,
      score: 88,
      rank: Rank.S,
      proComment: "在宅ケアの経験と認知症ケア資格が訪問看護と相性が良い。",
      conComment: "オンコールへの抵抗感を本人面談で確認すること。",
    },
    {
      category: FacilityCategory.HOSPITAL_GENERAL,
      score: 72,
      rank: Rank.B,
      proComment: "看護師経験はあるが、急性期での実務は限定的。",
      conComment: "急性期の業務量とのギャップに注意。",
    },
    {
      category: FacilityCategory.DAYCARE_ELDERLY,
      score: 65,
      rank: Rank.C,
      proComment: "高齢者対応の知見は活かせる。",
      conComment: "資格面で訪看の方がフィットする。",
    },
  ];

  for (const row of rows) {
    await prisma.diagnosis.upsert({
      where: { applicantId_category: { applicantId, category: row.category } },
      create: { applicantId, ...row },
      update: row,
    });
  }
}

async function seedSkillSheet(applicantId: string) {
  await prisma.skillSheet.upsert({
    where: { applicantId },
    update: {},
    create: {
      applicantId,
      educations: [
        { school: "架空看護専門学校", graduatedOn: "2013-03" },
      ],
      careers: [
        { facility: "架空訪問看護ステーション A", years: 5, role: "訪問看護師" },
        { facility: "架空クリニック B", years: 2, role: "外来看護師" },
      ],
      skills: ["バイタル管理", "服薬指導", "認知症ケア"],
      desired: {
        category: "HOMEVISIT_NURSE",
        prefecture: "東京都",
        annualIncomeMin: 4500000,
        startMonth: "2026-08",
      },
      selfPR: "在宅看護で利用者ご家族との関係構築を強みとしてきました。",
      completedAt: new Date(),
    },
  });
}

async function seedInterview(applicantId: string) {
  await prisma.interview.upsert({
    where: { applicantId },
    update: {},
    create: {
      applicantId,
      callSid: "CAseed00000000000000000000000001",
      startedAt: new Date("2026-05-10T10:00:00+09:00"),
      endedAt: new Date("2026-05-10T10:18:30+09:00"),
      durationSec: 1110,
      transcript: "(seed dummy) Q1: 強み → 在宅看護の経験。Q2: 希望条件 → 日勤中心。",
      summary: {
        strengths: ["在宅看護経験", "家族コミュニケーション"],
        concerns: ["オンコール体制への適応"],
        recommendation: "訪問看護 (日勤中心) 求人を優先提案",
      },
    },
  });
}

async function seedFacilities() {
  const data = [
    {
      key: "fac-anon-001",
      name: "架空訪問看護ステーションあおぞら",
      category: FacilityCategory.HOMEVISIT_NURSE,
      prefecture: "東京都",
      city: "新宿区",
      address: "(架空) 西新宿0-0-0",
      fax: "03-0000-0001",
      email: "anon-fac-001@example.test",
      isFaxPublic: true,
      notes: "seed: 訪問看護・日勤中心",
    },
    {
      key: "fac-anon-002",
      name: "架空デイサービスひだまり",
      category: FacilityCategory.DAYCARE_ELDERLY,
      prefecture: "神奈川県",
      city: "横浜市",
      address: "(架空) 中区0-0-0",
      fax: "045-000-0001",
      email: "anon-fac-002@example.test",
      isFaxPublic: true,
      notes: "seed: 高齢者デイ",
    },
    {
      key: "fac-anon-003",
      name: "架空グループホームひまわり",
      category: FacilityCategory.GROUP_HOME_DISABILITY,
      prefecture: "千葉県",
      city: "船橋市",
      address: "(架空) 本町0-0-0",
      fax: null,
      email: "anon-fac-003@example.test",
      isFaxPublic: false,
      notes: "seed: FAX 未公開",
    },
  ];

  const result = [];
  for (const f of data) {
    const existing = await prisma.facility.findFirst({ where: { name: f.name } });
    const row = existing
      ? await prisma.facility.update({ where: { id: existing.id }, data: f })
      : await prisma.facility.create({ data: f });
    result.push(row);
  }
  return result;
}

async function seedFaxSheet(applicantId: string, facilityId: string) {
  // 1 件の FaxSheet と、その反応（"興味あり"）を作る。
  const existing = await prisma.faxSheet.findFirst({ where: { applicantId, facilityId } });
  const sheet = existing
    ? existing
    : await prisma.faxSheet.create({
        data: {
          applicantId,
          facilityId,
          pdfKey: `seed/fax-sheets/${applicantId}-${facilityId}.pdf`,
          channel: "FAX",
          status: "SENT",
          sentAt: new Date("2026-05-11T11:00:00+09:00"),
        },
      });

  await prisma.faxReaction.upsert({
    where: { faxSheetId: sheet.id },
    update: {},
    create: {
      faxSheetId: sheet.id,
      facilityId,
      interested: true,
      comment: "(seed) 詳細を送付してほしい",
    },
  });
}

async function seedAuditLog(staffId: string) {
  await prisma.auditLog.create({
    data: {
      staffId,
      action: "seed.import",
      target: "seed",
      payload: { note: "Phase 1-2 seed run" },
    },
  });
}

async function main() {
  const { staff } = await seedAdmin();
  const { applicant1, applicant2 } = await seedApplicants();
  await seedDiagnoses(applicant1.id);
  await seedSkillSheet(applicant2.id);
  await seedInterview(applicant1.id);
  const facilities = await seedFacilities();
  await seedFaxSheet(applicant1.id, facilities[0].id);
  await seedAuditLog(staff.id);

  console.log("Seed complete");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
