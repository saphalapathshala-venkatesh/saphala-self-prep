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
};

function generateQuestionsForTest(testId: string, count: number): MockQuestion[] {
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
