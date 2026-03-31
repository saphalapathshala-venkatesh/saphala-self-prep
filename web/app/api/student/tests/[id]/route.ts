import { getStudentSession } from "@/lib/studentAuth";
import {
  getDbTestById,
  getDbQuestionsForTest,
  getTestSectionsForAttempt,
  resolveTestAccess,
  type DbTestSection,
} from "@/lib/testhubDb";

export const dynamic = "force-dynamic";

function computeTimerMode(sections: DbTestSection[]): "TOTAL" | "SECTION" | "SUBSECTION" {
  if (sections.length === 0) return "TOTAL";
  const hasSubsectionTimers = sections.some(
    (s) => s.subsections.length > 0 && s.subsections.some((sub) => sub.durationSec != null)
  );
  if (hasSubsectionTimers) return "SUBSECTION";
  const hasSectionTimers = sections.some((s) => s.durationSec != null);
  if (hasSectionTimers) return "SECTION";
  return "TOTAL";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getStudentSession();
  if (!auth) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { user } = auth;
  const { id: testId } = await params;

  const [test, sections, questions] = await Promise.all([
    getDbTestById(testId),
    getTestSectionsForAttempt(testId),
    getDbQuestionsForTest(testId),
  ]);

  if (!test) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }
  if (!test.isPublished) {
    return Response.json({ error: "Test is not available." }, { status: 404 });
  }
  if (test.seriesIsPublished === false) {
    return Response.json({ error: "Test is not available." }, { status: 404 });
  }
  if (test.scheduledUntil) {
    return Response.json({ error: "This test is not yet available.", code: "SCHEDULED" }, { status: 403 });
  }

  const access = await resolveTestAccess(test, user.id);
  if (access === "locked") {
    return Response.json({ error: "This test requires a premium plan.", code: "LOCKED" }, { status: 403 });
  }

  const timerMode = computeTimerMode(sections);
  const sectionsEnabled = sections.length > 0;
  const subsectionsEnabled = sections.some((s) => s.subsections.length > 0);

  return Response.json({
    id: test.id,
    title: test.title,
    code: test.code,
    instructions: test.instructions,
    languageAvailable: test.languageAvailable,
    attemptsAllowed: test.attemptsAllowed,
    marksPerQuestion: test.marksPerQuestion,
    negativeMarks: test.negativeMarks,
    totalDurationSec: test.durationSec,
    pauseAllowed: test.allowPause,
    strictSectionMode: test.strictSectionMode,
    sectionsEnabled,
    subsectionsEnabled,
    timerMode,
    sections,
    questions: questions.map((q) => ({
      id: q.id,
      sectionId: q.sectionId,
      displayOrder: q.order,
      stemEn: q.questionText_en,
      stemTe: q.questionText_te,
      groupId: q.groupId,
      paragraphHtml: q.paragraphHtml,
      options: q.options.map((o) => ({
        id: o.id,
        textEn: o.textEn,
        textTe: o.textTe,
        order: o.order,
      })),
    })),
  });
}
