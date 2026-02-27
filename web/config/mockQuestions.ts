export interface MockQuestion {
  id: string;
  order: number;
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

function generateQuestionsForTest(testId: string, count: number): MockQuestion[] {
  const questions: MockQuestion[] = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `${testId}-q${i}`,
      order: i,
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
