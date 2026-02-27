import type { MockTest } from "@/config/testhub";

interface ExamInstructionsContentProps {
  test: MockTest;
  attemptsUsed?: number;
}

export default function ExamInstructionsContent({ test, attemptsUsed }: ExamInstructionsContentProps) {
  const totalMarks = test.questions * test.marksPerQuestion;
  const attemptsLeft = attemptsUsed != null ? test.attemptsAllowed - attemptsUsed : null;

  return (
    <div className="space-y-6">
      <div className="bg-[#F6F2FF] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Exam Pattern</h2>
        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Test Code</span>
            <span className="font-medium text-gray-700">{test.testCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Questions</span>
            <span className="font-medium text-gray-700">{test.questions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Duration</span>
            <span className="font-medium text-gray-700">{test.duration ? `${test.duration} min` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Marks per Question</span>
            <span className="font-medium text-gray-700">+{test.marksPerQuestion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Negative Marking</span>
            <span className="font-medium text-gray-700">
              {test.negativeMarks > 0 ? `-${test.negativeMarks} per wrong` : "No negative marking"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total Marks</span>
            <span className="font-medium text-gray-700">{totalMarks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Difficulty</span>
            <span className="font-medium text-gray-700">{test.difficulty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Attempts Allowed</span>
            <span className="font-medium text-gray-700">{test.attemptsAllowed}</span>
          </div>
          {attemptsLeft != null && (
            <div className="flex justify-between">
              <span className="text-gray-500">Attempts Left</span>
              <span className={`font-medium ${attemptsLeft > 0 ? "text-green-600" : "text-red-500"}`}>
                {attemptsLeft}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Instructions</h2>
        <ul className="space-y-2.5 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">1.</span>
            <span>The test is timed. Once started, the timer cannot be paused or reset.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">2.</span>
            <span>
              Each correct answer carries <strong>+{test.marksPerQuestion} marks</strong>.{" "}
              {test.negativeMarks > 0
                ? <>Each wrong answer deducts <strong>{test.negativeMarks} mark</strong>.</>
                : "There is no negative marking."
              }{" "}
              Unanswered questions carry 0 marks.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">3.</span>
            <span>You can navigate between questions freely. Mark questions for review and return to them later.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">4.</span>
            <span>The test will auto-submit when the timer reaches zero. You may also submit manually before time ends.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">5.</span>
            <span>Your results, score breakdown, accuracy, and time analysis will be available immediately after submission.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">6.</span>
            <span>Do not close or refresh the browser during the test. Doing so may result in loss of unsaved answers.</span>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#2D1B69] mb-3">Rules</h2>
        <ul className="space-y-2.5 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">&bull;</span>
            <span>Only one option can be selected per question (single-choice).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">&bull;</span>
            <span>You may clear your selected option at any time before submission.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-500 font-bold mt-0.5 flex-shrink-0">&bull;</span>
            <span>The question palette shows answered, unanswered, and review-marked questions.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
