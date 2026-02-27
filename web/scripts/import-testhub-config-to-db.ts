import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createHash } from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type AccessType = "FREE" | "LOCKED";
type LangAvail = "EN" | "TE" | "BOTH";

interface ConfigTest {
  id: string;
  title: string;
  testCode: string;
  category: string;
  series: string;
  duration: number;
  questions: number;
  difficulty: "Easy" | "Medium" | "Hard";
  accessType: AccessType;
  marksPerQuestion: number;
  negativeMarks: number;
  attemptsAllowed: number;
  languageAvailable: LangAvail;
}

interface ConfigQuestion {
  id: string;
  order: number;
  subjectId: string;
  subjectName: string;
  correctOption: "A" | "B" | "C" | "D";
  questionText_en: string;
  questionText_te: string;
  optionA_en: string;
  optionA_te: string;
  optionB_en: string;
  optionB_te: string;
  optionC_en: string;
  optionC_te: string;
  optionD_en: string;
  optionD_te: string;
}

const seedTests: ConfigTest[] = [
  {
    id: "seed-free-en-neg", title: "Polity & Arithmetic - Quick Test (EN)", testCode: "SEED-001",
    category: "NEET", series: "Seed Tests", duration: 10, questions: 10, difficulty: "Easy",
    accessType: "FREE", marksPerQuestion: 1, negativeMarks: 0.25, attemptsAllowed: 2, languageAvailable: "EN",
  },
  {
    id: "seed-free-both-noneg", title: "Polity & Arithmetic - Bilingual (No Negative)", testCode: "SEED-002",
    category: "NEET", series: "Seed Tests", duration: 15, questions: 10, difficulty: "Easy",
    accessType: "FREE", marksPerQuestion: 1, negativeMarks: 0, attemptsAllowed: 2, languageAvailable: "BOTH",
  },
  {
    id: "seed-locked-en-neg", title: "Polity & Arithmetic - Premium (EN)", testCode: "SEED-003",
    category: "NEET", series: "Seed Tests", duration: 10, questions: 8, difficulty: "Medium",
    accessType: "LOCKED", marksPerQuestion: 1, negativeMarks: 0.25, attemptsAllowed: 2, languageAvailable: "EN",
  },
  {
    id: "seed-locked-both-neg", title: "Polity & Arithmetic - Premium Bilingual", testCode: "SEED-004",
    category: "NEET", series: "Seed Tests", duration: 15, questions: 10, difficulty: "Medium",
    accessType: "LOCKED", marksPerQuestion: 1, negativeMarks: 0.25, attemptsAllowed: 2, languageAvailable: "BOTH",
  },
  {
    id: "seed-locked-te-noneg", title: "రాజ్యాంగం & గణితం - ప్రీమియం (TE)", testCode: "SEED-005",
    category: "NEET", series: "Seed Tests", duration: 10, questions: 8, difficulty: "Easy",
    accessType: "LOCKED", marksPerQuestion: 1, negativeMarks: 0, attemptsAllowed: 2, languageAvailable: "TE",
  },
];

const polityEn = [
  { stem_en: "Who is known as the Father of the Indian Constitution?", stem_te: "భారత రాజ్యాంగ పితామహుడుగా ఎవరిని పిలుస్తారు?", options: [{ en: "Mahatma Gandhi", te: "మహాత్మా గాంధీ" }, { en: "Dr. B.R. Ambedkar", te: "డా. బి.ఆర్. అంబేద్కర్" }, { en: "Jawaharlal Nehru", te: "జవహర్‌లాల్ నెహ్రూ" }, { en: "Sardar Patel", te: "సర్దార్ పటేల్" }], correct: 1 },
  { stem_en: "How many fundamental rights are guaranteed by the Indian Constitution?", stem_te: "భారత రాజ్యాంగం ఎన్ని ప్రాథమిక హక్కులను హామీ ఇస్తుంది?", options: [{ en: "5", te: "5" }, { en: "6", te: "6" }, { en: "7", te: "7" }, { en: "8", te: "8" }], correct: 1 },
  { stem_en: "The Preamble of the Indian Constitution starts with which words?", stem_te: "భారత రాజ్యాంగం ప్రవేశిక ఏ పదాలతో ప్రారంభమవుతుంది?", options: [{ en: "We the citizens", te: "మేము పౌరులు" }, { en: "We the people", te: "మేము ప్రజలు" }, { en: "We the nation", te: "మేము దేశం" }, { en: "We the republic", te: "మేము గణతంత్రం" }], correct: 1 },
  { stem_en: "Which article of the Indian Constitution abolishes untouchability?", stem_te: "భారత రాజ్యాంగంలో ఏ ఆర్టికల్ అంటరానితనాన్ని రద్దు చేస్తుంది?", options: [{ en: "Article 14", te: "ఆర్టికల్ 14" }, { en: "Article 15", te: "ఆర్టికల్ 15" }, { en: "Article 17", te: "ఆర్టికల్ 17" }, { en: "Article 19", te: "ఆర్టికల్ 19" }], correct: 2 },
  { stem_en: "The minimum age to become the President of India is:", stem_te: "భారత రాష్ట్రపతి కావడానికి కనీస వయస్సు:", options: [{ en: "25 years", te: "25 సంవత్సరాలు" }, { en: "30 years", te: "30 సంవత్సరాలు" }, { en: "35 years", te: "35 సంవత్సరాలు" }, { en: "40 years", te: "40 సంవత్సరాలు" }], correct: 2 },
];

const arithmeticEn = [
  { stem_en: "What is the LCM of 12 and 18?", stem_te: "12 మరియు 18 యొక్క కనీస సామాన్య గుణిజం ఏమిటి?", options: [{ en: "24", te: "24" }, { en: "36", te: "36" }, { en: "48", te: "48" }, { en: "72", te: "72" }], correct: 1 },
  { stem_en: "If a shirt costs ₹500 and is sold at 20% discount, what is the selling price?", stem_te: "ఒక చొక్కా ₹500 ఉంటే 20% తగ్గింపుతో అమ్మితే, అమ్మకపు ధర ఎంత?", options: [{ en: "₹380", te: "₹380" }, { en: "₹400", te: "₹400" }, { en: "₹420", te: "₹420" }, { en: "₹450", te: "₹450" }], correct: 1 },
  { stem_en: "The ratio of 2 hours to 30 minutes is:", stem_te: "2 గంటలకు 30 నిమిషాల నిష్పత్తి:", options: [{ en: "2:1", te: "2:1" }, { en: "4:1", te: "4:1" }, { en: "1:4", te: "1:4" }, { en: "3:1", te: "3:1" }], correct: 1 },
  { stem_en: "What is the simple interest on ₹1000 at 10% per annum for 2 years?", stem_te: "₹1000 పై 10% వార్షిక వడ్డీ రేటుతో 2 సంవత్సరాలకు సాధారణ వడ్డీ ఎంత?", options: [{ en: "₹100", te: "₹100" }, { en: "₹150", te: "₹150" }, { en: "₹200", te: "₹200" }, { en: "₹250", te: "₹250" }], correct: 2 },
  { stem_en: "A train 200m long passes a pole in 20 seconds. What is its speed?", stem_te: "200 మీటర్ల పొడవున్న రైలు ఒక స్తంభాన్ని 20 సెకన్లలో దాటింది. దాని వేగం ఎంత?", options: [{ en: "36 km/h", te: "36 కి.మీ/గం" }, { en: "10 km/h", te: "10 కి.మీ/గం" }, { en: "20 km/h", te: "20 కి.మీ/గం" }, { en: "25 km/h", te: "25 కి.మీ/గం" }], correct: 0 },
];

const allQuestions = [...polityEn.map(q => ({ ...q, subjectId: "polity", subjectName: "Polity" })), ...arithmeticEn.map(q => ({ ...q, subjectId: "arithmetic", subjectName: "Arithmetic" }))];

function getQuestionsForConfigTest(testCode: string, count: number) {
  if (testCode === "SEED-003") return allQuestions.slice(0, 8);
  if (testCode === "SEED-005") return allQuestions.slice(0, 4).concat(allQuestions.slice(5, 9));
  return allQuestions.slice(0, count);
}

function contentHash(stemEn: string | null, stemTe: string | null, options: { en: string; te: string }[], testCode: string): string {
  const raw = [stemEn || "", stemTe || "", ...options.map(o => o.en + o.te), testCode].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function difficultyMap(d: string) {
  if (d === "Easy") return "FOUNDATIONAL" as const;
  if (d === "Medium") return "PROFICIENT" as const;
  return "MASTERY" as const;
}

async function main() {
  console.log("\n=== Importing TestHub config to DB ===\n");

  let systemUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!systemUser) {
    systemUser = await prisma.user.findFirst();
  }
  if (!systemUser) {
    console.error("No user found in DB. Create at least one user first.");
    process.exit(1);
  }
  console.log(`Using system user: ${systemUser.email || systemUser.id}\n`);

  let series = await prisma.testSeries.findFirst({ where: { title: "Seed Series" } });
  if (!series) {
    series = await prisma.testSeries.create({
      data: {
        title: "Seed Series",
        description: "Seed tests imported from config for TestHub v1",
        isPublished: true,
        createdById: systemUser.id,
      },
    });
    console.log(`Created TestSeries: "${series.title}" (${series.id})`);
  } else {
    console.log(`Found existing TestSeries: "${series.title}" (${series.id})`);
  }

  let testsCreated = 0;
  let testsUpdated = 0;
  let questionsCreated = 0;
  let linksCreated = 0;

  for (const ct of seedTests) {
    const questions = getQuestionsForConfigTest(ct.testCode, ct.questions);

    let test = await prisma.test.findUnique({ where: { code: ct.testCode } });

    if (test) {
      test = await prisma.test.update({
        where: { id: test.id },
        data: {
          title: ct.title,
          accessType: ct.accessType,
          languageAvailable: ct.languageAvailable,
          marksPerQuestion: ct.marksPerQuestion,
          negativeMarksPerQuestion: ct.negativeMarks,
          attemptsAllowed: ct.attemptsAllowed,
          durationSec: ct.duration * 60,
          isPublished: true,
        },
      });
      testsUpdated++;
      console.log(`Updated test: ${ct.testCode} → ${test.id}`);
    } else {
      test = await prisma.test.create({
        data: {
          title: ct.title,
          code: ct.testCode,
          seriesId: series.id,
          mode: "TIMED",
          isTimed: true,
          durationSec: ct.duration * 60,
          isPublished: true,
          publishedAt: new Date(),
          createdById: systemUser.id,
          accessType: ct.accessType,
          languageAvailable: ct.languageAvailable,
          marksPerQuestion: ct.marksPerQuestion,
          negativeMarksPerQuestion: ct.negativeMarks,
          attemptsAllowed: ct.attemptsAllowed,
          subjectIds: ["polity", "arithmetic"],
        },
      });
      testsCreated++;
      console.log(`Created test: ${ct.testCode} → ${test.id}`);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hash = contentHash(q.stem_en, q.stem_te, q.options, ct.testCode);

      let question = await prisma.question.findUnique({ where: { contentHash: hash } });

      if (!question) {
        const stemEn = q.stem_en;
        const stemTe = q.stem_te;

        question = await prisma.question.create({
          data: {
            type: "MCQ_SINGLE",
            difficulty: difficultyMap(ct.difficulty),
            status: "APPROVED",
            stem: stemEn || stemTe || "",
            stemEn: stemEn || null,
            stemTe: stemTe || null,
            subjectId: q.subjectId,
            contentHash: hash,
            options: {
              create: q.options.map((opt, idx) => ({
                text: opt.en || opt.te || "",
                textEn: opt.en || null,
                textTe: opt.te || null,
                isCorrect: idx === q.correct,
                order: idx,
              })),
            },
          },
        });
        questionsCreated++;
      }

      const existing = await prisma.testQuestion.findUnique({
        where: { testId_questionId: { testId: test.id, questionId: question.id } },
      });

      if (!existing) {
        await prisma.testQuestion.create({
          data: {
            testId: test.id,
            questionId: question.id,
            order: i + 1,
          },
        });
        linksCreated++;
      }
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Tests created: ${testsCreated}`);
  console.log(`Tests updated: ${testsUpdated}`);
  console.log(`Questions created: ${questionsCreated}`);
  console.log(`TestQuestion links created: ${linksCreated}`);

  const dbTests = await prisma.test.findMany({
    where: { code: { in: seedTests.map(t => t.testCode) } },
    select: { id: true, code: true, title: true, accessType: true, languageAvailable: true },
    orderBy: { code: "asc" },
  });

  console.log("\n=== DB Tests ===");
  console.log("┌──────────────┬────────────┬────────┬──────────────────────────────────────┐");
  console.log("│ Code         │ Access     │ Lang   │ ID                                   │");
  console.log("├──────────────┼────────────┼────────┼──────────────────────────────────────┤");
  for (const t of dbTests) {
    console.log(`│ ${(t.code || "").padEnd(12)} │ ${t.accessType.padEnd(10)} │ ${t.languageAvailable.padEnd(6)} │ ${t.id.padEnd(36)} │`);
  }
  console.log("└──────────────┴────────────┴────────┴──────────────────────────────────────┘");

  await prisma.$disconnect();
  await pool.end();
  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
