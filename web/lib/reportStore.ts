export interface QuestionReport {
  id: string;
  userId: string;
  attemptId: string;
  questionId: string;
  issueType: string;
  message: string;
  createdAt: string;
}

const reports: QuestionReport[] = [];

export function saveQuestionReport(data: {
  userId: string;
  attemptId: string;
  questionId: string;
  issueType: string;
  message: string;
}): QuestionReport {
  const report: QuestionReport = {
    id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  return report;
}

export function getReportsForQuestion(questionId: string): QuestionReport[] {
  return reports.filter((r) => r.questionId === questionId);
}
