export interface MockQuestion {
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

const subjectMap: Record<string, Array<{ id: string; name: string }>> = {
  "neet-bio-1": [{ id: "biology", name: "Biology" }],
  "neet-chem-1": [{ id: "chemistry", name: "Chemistry" }],
  "neet-phy-1": [{ id: "physics", name: "Physics" }],
  "neet-grand-1": [
    { id: "physics", name: "Physics" },
    { id: "chemistry", name: "Chemistry" },
    { id: "botany", name: "Botany" },
    { id: "zoology", name: "Zoology" },
  ],
  "jee-math-1": [{ id: "mathematics", name: "Mathematics" }],
  "jee-phy-1": [{ id: "physics", name: "Physics" }],
  "seed-free-en-neg": [
    { id: "polity", name: "Polity" },
    { id: "arithmetic", name: "Arithmetic" },
  ],
  "seed-free-both-noneg": [
    { id: "polity", name: "Polity" },
    { id: "arithmetic", name: "Arithmetic" },
  ],
  "seed-locked-en-neg": [
    { id: "polity", name: "Polity" },
    { id: "arithmetic", name: "Arithmetic" },
  ],
  "seed-locked-both-neg": [
    { id: "polity", name: "Polity" },
    { id: "arithmetic", name: "Arithmetic" },
  ],
  "seed-locked-te-noneg": [
    { id: "polity", name: "Polity" },
    { id: "arithmetic", name: "Arithmetic" },
  ],
};

interface SeedQuestion {
  questionText_en: string | null;
  questionText_te: string | null;
  optionA_en: string | null;
  optionA_te: string | null;
  optionB_en: string | null;
  optionB_te: string | null;
  optionC_en: string | null;
  optionC_te: string | null;
  optionD_en: string | null;
  optionD_te: string | null;
  correctOption: "A" | "B" | "C" | "D";
  subjectId: string;
  subjectName: string;
}

const polityQuestionsEn: SeedQuestion[] = [
  { questionText_en: "Who is known as the Father of the Indian Constitution?", questionText_te: null, optionA_en: "Mahatma Gandhi", optionA_te: null, optionB_en: "Dr. B.R. Ambedkar", optionB_te: null, optionC_en: "Jawaharlal Nehru", optionC_te: null, optionD_en: "Sardar Patel", optionD_te: null, correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "How many fundamental rights are guaranteed by the Indian Constitution?", questionText_te: null, optionA_en: "5", optionA_te: null, optionB_en: "6", optionB_te: null, optionC_en: "7", optionC_te: null, optionD_en: "8", optionD_te: null, correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "The Preamble of the Indian Constitution starts with which words?", questionText_te: null, optionA_en: "We the citizens", optionA_te: null, optionB_en: "We the people", optionB_te: null, optionC_en: "We the nation", optionC_te: null, optionD_en: "We the republic", optionD_te: null, correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "Which article of the Indian Constitution abolishes untouchability?", questionText_te: null, optionA_en: "Article 14", optionA_te: null, optionB_en: "Article 15", optionB_te: null, optionC_en: "Article 17", optionC_te: null, optionD_en: "Article 19", optionD_te: null, correctOption: "C", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "The minimum age to become the President of India is:", questionText_te: null, optionA_en: "25 years", optionA_te: null, optionB_en: "30 years", optionB_te: null, optionC_en: "35 years", optionC_te: null, optionD_en: "40 years", optionD_te: null, correctOption: "C", subjectId: "polity", subjectName: "Polity" },
];

const arithmeticQuestionsEn: SeedQuestion[] = [
  { questionText_en: "What is the LCM of 12 and 18?", questionText_te: null, optionA_en: "24", optionA_te: null, optionB_en: "36", optionB_te: null, optionC_en: "48", optionC_te: null, optionD_en: "72", optionD_te: null, correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "If a shirt costs ₹500 and is sold at 20% discount, what is the selling price?", questionText_te: null, optionA_en: "₹380", optionA_te: null, optionB_en: "₹400", optionB_te: null, optionC_en: "₹420", optionC_te: null, optionD_en: "₹450", optionD_te: null, correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "The ratio of 2 hours to 30 minutes is:", questionText_te: null, optionA_en: "2:1", optionA_te: null, optionB_en: "4:1", optionB_te: null, optionC_en: "1:4", optionC_te: null, optionD_en: "3:1", optionD_te: null, correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "What is the simple interest on ₹1000 at 10% per annum for 2 years?", questionText_te: null, optionA_en: "₹100", optionA_te: null, optionB_en: "₹150", optionB_te: null, optionC_en: "₹200", optionC_te: null, optionD_en: "₹250", optionD_te: null, correctOption: "C", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "A train 200m long passes a pole in 20 seconds. What is its speed?", questionText_te: null, optionA_en: "36 km/h", optionA_te: null, optionB_en: "10 km/h", optionB_te: null, optionC_en: "20 km/h", optionC_te: null, optionD_en: "25 km/h", optionD_te: null, correctOption: "A", subjectId: "arithmetic", subjectName: "Arithmetic" },
];

const polityQuestionsBoth: SeedQuestion[] = [
  { questionText_en: "Who is known as the Father of the Indian Constitution?", questionText_te: "భారత రాజ్యాంగ పితామహుడుగా ఎవరిని పిలుస్తారు?", optionA_en: "Mahatma Gandhi", optionA_te: "మహాత్మా గాంధీ", optionB_en: "Dr. B.R. Ambedkar", optionB_te: "డా. బి.ఆర్. అంబేద్కర్", optionC_en: "Jawaharlal Nehru", optionC_te: "జవహర్‌లాల్ నెహ్రూ", optionD_en: "Sardar Patel", optionD_te: "సర్దార్ పటేల్", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "How many fundamental rights are guaranteed by the Indian Constitution?", questionText_te: "భారత రాజ్యాంగం ఎన్ని ప్రాథమిక హక్కులను హామీ ఇస్తుంది?", optionA_en: "5", optionA_te: "5", optionB_en: "6", optionB_te: "6", optionC_en: "7", optionC_te: "7", optionD_en: "8", optionD_te: "8", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "The Preamble of the Indian Constitution starts with which words?", questionText_te: "భారత రాజ్యాంగం ప్రవేశిక ఏ పదాలతో ప్రారంభమవుతుంది?", optionA_en: "We the citizens", optionA_te: "మేము పౌరులు", optionB_en: "We the people", optionB_te: "మేము ప్రజలు", optionC_en: "We the nation", optionC_te: "మేము దేశం", optionD_en: "We the republic", optionD_te: "మేము గణతంత్రం", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "Which article of the Indian Constitution abolishes untouchability?", questionText_te: "భారత రాజ్యాంగంలో ఏ ఆర్టికల్ అంటరానితనాన్ని రద్దు చేస్తుంది?", optionA_en: "Article 14", optionA_te: "ఆర్టికల్ 14", optionB_en: "Article 15", optionB_te: "ఆర్టికల్ 15", optionC_en: "Article 17", optionC_te: "ఆర్టికల్ 17", optionD_en: "Article 19", optionD_te: "ఆర్టికల్ 19", correctOption: "C", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: "The minimum age to become the President of India is:", questionText_te: "భారత రాష్ట్రపతి కావడానికి కనీస వయస్సు:", optionA_en: "25 years", optionA_te: "25 సంవత్సరాలు", optionB_en: "30 years", optionB_te: "30 సంవత్సరాలు", optionC_en: "35 years", optionC_te: "35 సంవత్సరాలు", optionD_en: "40 years", optionD_te: "40 సంవత్సరాలు", correctOption: "C", subjectId: "polity", subjectName: "Polity" },
];

const arithmeticQuestionsBoth: SeedQuestion[] = [
  { questionText_en: "What is the LCM of 12 and 18?", questionText_te: "12 మరియు 18 యొక్క కనీస సామాన్య గుణిజం ఏమిటి?", optionA_en: "24", optionA_te: "24", optionB_en: "36", optionB_te: "36", optionC_en: "48", optionC_te: "48", optionD_en: "72", optionD_te: "72", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "If a shirt costs ₹500 and is sold at 20% discount, what is the selling price?", questionText_te: "ఒక చొక్కా ₹500 ఉంటే 20% తగ్గింపుతో అమ్మితే, అమ్మకపు ధర ఎంత?", optionA_en: "₹380", optionA_te: "₹380", optionB_en: "₹400", optionB_te: "₹400", optionC_en: "₹420", optionC_te: "₹420", optionD_en: "₹450", optionD_te: "₹450", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "The ratio of 2 hours to 30 minutes is:", questionText_te: "2 గంటలకు 30 నిమిషాల నిష్పత్తి:", optionA_en: "2:1", optionA_te: "2:1", optionB_en: "4:1", optionB_te: "4:1", optionC_en: "1:4", optionC_te: "1:4", optionD_en: "3:1", optionD_te: "3:1", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "What is the simple interest on ₹1000 at 10% per annum for 2 years?", questionText_te: "₹1000 పై 10% వార్షిక వడ్డీ రేటుతో 2 సంవత్సరాలకు సాధారణ వడ్డీ ఎంత?", optionA_en: "₹100", optionA_te: "₹100", optionB_en: "₹150", optionB_te: "₹150", optionC_en: "₹200", optionC_te: "₹200", optionD_en: "₹250", optionD_te: "₹250", correctOption: "C", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: "A train 200m long passes a pole in 20 seconds. What is its speed?", questionText_te: "200 మీటర్ల పొడవున్న రైలు ఒక స్తంభాన్ని 20 సెకన్లలో దాటింది. దాని వేగం ఎంత?", optionA_en: "36 km/h", optionA_te: "36 కి.మీ/గం", optionB_en: "10 km/h", optionB_te: "10 కి.మీ/గం", optionC_en: "20 km/h", optionC_te: "20 కి.మీ/గం", optionD_en: "25 km/h", optionD_te: "25 కి.మీ/గం", correctOption: "A", subjectId: "arithmetic", subjectName: "Arithmetic" },
];

const polityQuestionsTe: SeedQuestion[] = [
  { questionText_en: null, questionText_te: "భారత రాజ్యాంగ పితామహుడుగా ఎవరిని పిలుస్తారు?", optionA_en: null, optionA_te: "మహాత్మా గాంధీ", optionB_en: null, optionB_te: "డా. బి.ఆర్. అంబేద్కర్", optionC_en: null, optionC_te: "జవహర్‌లాల్ నెహ్రూ", optionD_en: null, optionD_te: "సర్దార్ పటేల్", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: null, questionText_te: "భారత రాజ్యాంగం ఎన్ని ప్రాథమిక హక్కులను హామీ ఇస్తుంది?", optionA_en: null, optionA_te: "5", optionB_en: null, optionB_te: "6", optionC_en: null, optionC_te: "7", optionD_en: null, optionD_te: "8", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: null, questionText_te: "భారత రాజ్యాంగం ప్రవేశిక ఏ పదాలతో ప్రారంభమవుతుంది?", optionA_en: null, optionA_te: "మేము పౌరులు", optionB_en: null, optionB_te: "మేము ప్రజలు", optionC_en: null, optionC_te: "మేము దేశం", optionD_en: null, optionD_te: "మేము గణతంత్రం", correctOption: "B", subjectId: "polity", subjectName: "Polity" },
  { questionText_en: null, questionText_te: "భారత రాజ్యాంగంలో ఏ ఆర్టికల్ అంటరానితనాన్ని రద్దు చేస్తుంది?", optionA_en: null, optionA_te: "ఆర్టికల్ 14", optionB_en: null, optionB_te: "ఆర్టికల్ 15", optionC_en: null, optionC_te: "ఆర్టికల్ 17", optionD_en: null, optionD_te: "ఆర్టికల్ 19", correctOption: "C", subjectId: "polity", subjectName: "Polity" },
];

const arithmeticQuestionsTe: SeedQuestion[] = [
  { questionText_en: null, questionText_te: "12 మరియు 18 యొక్క కనీస సామాన్య గుణిజం ఏమిటి?", optionA_en: null, optionA_te: "24", optionB_en: null, optionB_te: "36", optionC_en: null, optionC_te: "48", optionD_en: null, optionD_te: "72", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: null, questionText_te: "ఒక చొక్కా ₹500 ఉంటే 20% తగ్గింపుతో అమ్మితే, అమ్మకపు ధర ఎంత?", optionA_en: null, optionA_te: "₹380", optionB_en: null, optionB_te: "₹400", optionC_en: null, optionC_te: "₹420", optionD_en: null, optionD_te: "₹450", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: null, questionText_te: "2 గంటలకు 30 నిమిషాల నిష్పత్తి:", optionA_en: null, optionA_te: "2:1", optionB_en: null, optionB_te: "4:1", optionC_en: null, optionC_te: "1:4", optionD_en: null, optionD_te: "3:1", correctOption: "B", subjectId: "arithmetic", subjectName: "Arithmetic" },
  { questionText_en: null, questionText_te: "₹1000 పై 10% వార్షిక వడ్డీ రేటుతో 2 సంవత్సరాలకు సాధారణ వడ్డీ ఎంత?", optionA_en: null, optionA_te: "₹100", optionB_en: null, optionB_te: "₹150", optionC_en: null, optionC_te: "₹200", optionD_en: null, optionD_te: "₹250", correctOption: "C", subjectId: "arithmetic", subjectName: "Arithmetic" },
];

const seedQuestionBank: Record<string, SeedQuestion[]> = {
  "seed-free-en-neg": [...polityQuestionsEn, ...arithmeticQuestionsEn],
  "seed-free-both-noneg": [...polityQuestionsBoth, ...arithmeticQuestionsBoth],
  "seed-locked-en-neg": [...polityQuestionsEn.slice(0, 4), ...arithmeticQuestionsEn.slice(0, 4)],
  "seed-locked-both-neg": [...polityQuestionsBoth, ...arithmeticQuestionsBoth],
  "seed-locked-te-noneg": [...polityQuestionsTe, ...arithmeticQuestionsTe],
};

function generateQuestionsForTest(testId: string, count: number): MockQuestion[] {
  const seedBank = seedQuestionBank[testId];
  if (seedBank) {
    return seedBank.slice(0, count).map((sq, i) => ({
      id: `${testId}-q${i + 1}`,
      order: i + 1,
      subjectId: sq.subjectId,
      subjectName: sq.subjectName,
      correctOption: sq.correctOption,
      questionText_en: sq.questionText_en || `Question ${i + 1}`,
      questionText_te: sq.questionText_te || `ప్రశ్న ${i + 1}`,
      optionA_en: sq.optionA_en || `A`,
      optionA_te: sq.optionA_te || `A`,
      optionB_en: sq.optionB_en || `B`,
      optionB_te: sq.optionB_te || `B`,
      optionC_en: sq.optionC_en || `C`,
      optionC_te: sq.optionC_te || `C`,
      optionD_en: sq.optionD_en || `D`,
      optionD_te: sq.optionD_te || `D`,
    }));
  }

  const subjects = subjectMap[testId] || [{ id: "general", name: "General" }];
  const questions: MockQuestion[] = [];
  for (let i = 1; i <= count; i++) {
    const subject = subjects[(i - 1) % subjects.length];
    const options: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
    const correctOption = options[(i - 1) % 4];
    questions.push({
      id: `${testId}-q${i}`,
      order: i,
      subjectId: subject.id,
      subjectName: subject.name,
      correctOption,
      questionText_en: `Question ${i}: This is a sample question for the test. Which of the following options is correct?`,
      questionText_te: `ప్రశ్న ${i}: ఇది పరీక్ష కోసం నమూనా ప్రశ్న. కింది ఎంపికలలో ఏది సరైనది?`,
      optionA_en: `Option A for question ${i}`,
      optionA_te: `ప్రశ్న ${i} కోసం ఎంపిక A`,
      optionB_en: `Option B for question ${i}`,
      optionB_te: `ప్రశ్న ${i} కోసం ఎంపిక B`,
      optionC_en: `Option C for question ${i}`,
      optionC_te: `ప్రశ్న ${i} కోసం ఎంపిక C`,
      optionD_en: `Option D for question ${i}`,
      optionD_te: `ప్రశ్న ${i} కోసం ఎంపిక D`,
    });
  }
  return questions;
}

const questionCache: Map<string, MockQuestion[]> = new Map();

export function getQuestionsForTest(testId: string, questionCount: number): MockQuestion[] {
  if (!questionCache.has(testId)) {
    questionCache.set(testId, generateQuestionsForTest(testId, questionCount));
  }
  return questionCache.get(testId)!;
}
