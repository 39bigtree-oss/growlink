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

/**
 * v1 final: ADMIN 以外のロールにもデモアカウントを用意。README に記載のパスワードと一致させる。
 */
async function seedDemoStaff() {
  const demoUsers: Array<{ email: string; password: string; name: string; role: StaffRole }> = [
    { email: "consultant@growlink.local", password: "growlink-consultant-pass", name: "デモ コンサル", role: StaffRole.CONSULTANT },
    { email: "sales@growlink.local", password: "growlink-sales-pass", name: "デモ 営業", role: StaffRole.SALES },
    { email: "viewer@growlink.local", password: "growlink-viewer-pass", name: "デモ ビューア", role: StaffRole.VIEWER },
  ];
  for (const u of demoUsers) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash },
      create: { email: u.email, name: u.name, passwordHash, emailVerified: new Date() },
    });
    await prisma.staff.upsert({
      where: { userId: user.id },
      update: { role: u.role, name: u.name, email: u.email },
      create: { userId: user.id, email: u.email, name: u.name, role: u.role },
    });
    console.log(`Seeded demo staff: ${u.email} (${u.role})`);
  }
}

/**
 * v1 final: 業務感を出すための追加サンプル申込 (架空 6 名)。実 PII を絶対に含めない。
 * 各 status を散らし、ダッシュボードの「ステータス別件数」がそれっぽく見えるようにする。
 */
async function seedExtraApplicants() {
  const samples: Array<{
    email: string;
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    birthDate: string;
    gender: Gender;
    status: ApplicantStatus;
    nationality?: string;
    language?: string;
    desired: FacilityCategory[];
    qualifications: string[];
  }> = [
    { email: "anon-nurse-003@example.test", lastName: "佐藤", firstName: "美咲", lastNameKana: "サトウ", firstNameKana: "ミサキ", birthDate: "1988-08-23", gender: Gender.FEMALE, status: ApplicantStatus.SKILL_SHEET_INPROGRESS, desired: [FacilityCategory.HOMEVISIT_NURSE], qualifications: ["看護師"] },
    { email: "anon-careworker-004@example.test", lastName: "鈴木", firstName: "大輔", lastNameKana: "スズキ", firstNameKana: "ダイスケ", birthDate: "1995-11-02", gender: Gender.MALE, status: ApplicantStatus.SKILL_SHEET_DONE, desired: [FacilityCategory.DAYCARE_ELDERLY], qualifications: ["介護福祉士"] },
    { email: "anon-nurse-vi-005@example.test", lastName: "Le", firstName: "Thi An", lastNameKana: "レ", firstNameKana: "ティ アン", birthDate: "1993-09-15", gender: Gender.FEMALE, status: ApplicantStatus.INTERVIEW_DONE, nationality: "VN", language: "vi", desired: [FacilityCategory.DAYCARE_ELDERLY, FacilityCategory.HOMEVISIT_CARE], qualifications: ["介護福祉士 (特定技能)"] },
    { email: "anon-nurse-006@example.test", lastName: "高橋", firstName: "翔", lastNameKana: "タカハシ", firstNameKana: "ショウ", birthDate: "1985-02-09", gender: Gender.MALE, status: ApplicantStatus.SALES_READY, desired: [FacilityCategory.HOSPITAL_GENERAL], qualifications: ["看護師", "保健師"] },
    { email: "anon-nurse-007@example.test", lastName: "山本", firstName: "あかり", lastNameKana: "ヤマモト", firstNameKana: "アカリ", birthDate: "1997-06-30", gender: Gender.FEMALE, status: ApplicantStatus.IN_INTRODUCTION, desired: [FacilityCategory.CLINIC], qualifications: ["看護師"] },
    { email: "anon-careworker-008@example.test", lastName: "田中", firstName: "誠", lastNameKana: "タナカ", firstNameKana: "マコト", birthDate: "1982-12-04", gender: Gender.MALE, status: ApplicantStatus.CONTRACTED, desired: [FacilityCategory.HOMEVISIT_NURSE_PSYCHIATRY], qualifications: ["精神保健福祉士"] },
  ];
  const out = [] as Array<{ id: string; email: string }>;
  for (const s of samples) {
    const ap = await prisma.applicant.upsert({
      where: { email: s.email },
      update: { status: s.status },
      create: {
        lastName: s.lastName,
        firstName: s.firstName,
        lastNameKana: s.lastNameKana,
        firstNameKana: s.firstNameKana,
        birthDate: new Date(s.birthDate),
        gender: s.gender,
        email: s.email,
        phone: "+81-90-0000-0000",
        nationality: s.nationality ?? null,
        language: s.language ?? "ja",
        wantsDiagnosis: true,
        desiredCategories: s.desired,
        status: s.status,
        qualifications: { create: s.qualifications.map((name) => ({ name })) },
      },
    });
    out.push({ id: ap.id, email: ap.email });
  }
  console.log(`Seeded ${out.length} extra applicants`);
  return out;
}

/**
 * v1 final: 50 件規模に近づけるための追加施設 (架空 18 件)。CSV インポートの動作確認も兼ねる。
 */
async function seedExtraFacilities() {
  const samples = [
    { name: "(架空) みやこ訪問看護", category: FacilityCategory.HOMEVISIT_NURSE, prefecture: "京都府", city: "京都市中京区", address: "三条0-0-0", fax: "075-000-0001", isFaxPublic: true },
    { name: "(架空) ふじみ通所介護", category: FacilityCategory.DAYCARE_ELDERLY, prefecture: "静岡県", city: "富士市", address: "本町1-1", fax: "0545-00-0001", isFaxPublic: true },
    { name: "(架空) ひまわりリハ", category: FacilityCategory.REHAB_DAY, prefecture: "大阪府", city: "大阪市北区", address: "梅田0-0", fax: "06-0000-0002", isFaxPublic: true },
    { name: "(架空) あかしクリニック", category: FacilityCategory.CLINIC, prefecture: "兵庫県", city: "明石市", address: "本町0-0", fax: "078-000-0003", isFaxPublic: false },
    { name: "(架空) みなと総合病院", category: FacilityCategory.HOSPITAL_GENERAL, prefecture: "神奈川県", city: "横浜市中区", address: "山下町0-0", fax: "045-000-0004", isFaxPublic: true },
    { name: "(架空) サンライズ精神訪問", category: FacilityCategory.HOMEVISIT_NURSE_PSYCHIATRY, prefecture: "福岡県", city: "福岡市博多区", address: "祇園0-0", fax: "092-000-0005", isFaxPublic: true },
    { name: "(架空) ステップ障害デイ", category: FacilityCategory.DAYCARE_DISABILITY, prefecture: "宮城県", city: "仙台市青葉区", address: "国分町0-0", fax: "022-000-0006", isFaxPublic: true },
    { name: "(架空) ハート訪問介護", category: FacilityCategory.HOMEVISIT_CARE, prefecture: "愛知県", city: "名古屋市中区", address: "栄0-0", fax: "052-000-0007", isFaxPublic: true },
    { name: "(架空) もみじ障害訪問", category: FacilityCategory.HOMEVISIT_DISABILITY, prefecture: "広島県", city: "広島市中区", address: "紙屋町0-0", fax: "082-000-0008", isFaxPublic: true },
    { name: "(架空) なないろグループホーム", category: FacilityCategory.GROUP_HOME_DISABILITY, prefecture: "北海道", city: "札幌市中央区", address: "南1条0-0", fax: "011-000-0009", isFaxPublic: false },
    { name: "(架空) かもめ急性期病院", category: FacilityCategory.HOSPITAL_ACUTE, prefecture: "千葉県", city: "市川市", address: "市川0-0", fax: "047-000-0010", isFaxPublic: true },
    { name: "(架空) ひだまり訪問看護", category: FacilityCategory.HOMEVISIT_NURSE, prefecture: "東京都", city: "世田谷区", address: "三軒茶屋0-0", fax: "03-0000-0011", isFaxPublic: true },
    { name: "(架空) こすもす通所", category: FacilityCategory.DAYCARE_ELDERLY, prefecture: "東京都", city: "杉並区", address: "高円寺0-0", fax: "03-0000-0012", isFaxPublic: true },
    { name: "(架空) きずなリハ", category: FacilityCategory.REHAB_DAY, prefecture: "東京都", city: "練馬区", address: "豊玉0-0", fax: "03-0000-0013", isFaxPublic: true },
    { name: "(架空) みらいクリニック", category: FacilityCategory.CLINIC, prefecture: "東京都", city: "渋谷区", address: "代々木0-0", fax: "03-0000-0014", isFaxPublic: false },
    { name: "(架空) たいよう訪問看護 (精神)", category: FacilityCategory.HOMEVISIT_NURSE_PSYCHIATRY, prefecture: "東京都", city: "豊島区", address: "東池袋0-0", fax: "03-0000-0015", isFaxPublic: true },
    { name: "(架空) ふれあい障害デイ", category: FacilityCategory.DAYCARE_DISABILITY, prefecture: "東京都", city: "葛飾区", address: "金町0-0", fax: "03-0000-0016", isFaxPublic: true },
    { name: "(架空) いずみ訪問介護", category: FacilityCategory.HOMEVISIT_CARE, prefecture: "東京都", city: "足立区", address: "千住0-0", fax: "03-0000-0017", isFaxPublic: true },
  ];
  for (const s of samples) {
    const existing = await prisma.facility.findFirst({
      where: { name: s.name, prefecture: s.prefecture, city: s.city },
    });
    if (existing) continue;
    await prisma.facility.create({ data: s });
  }
  console.log(`Seeded ${samples.length} extra facilities (skipped existing)`);
}

async function main() {
  const { staff } = await seedAdmin();
  await seedDemoStaff();
  const { applicant1, applicant2 } = await seedApplicants();
  await seedDiagnoses(applicant1.id);
  await seedSkillSheet(applicant2.id);
  await seedInterview(applicant1.id);
  const facilities = await seedFacilities();
  await seedFaxSheet(applicant1.id, facilities[0].id);
  await seedAuditLog(staff.id);

  await seedExtraApplicants();
  await seedExtraFacilities();

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
