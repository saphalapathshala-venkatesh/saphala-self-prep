export type AccessType = "FREE" | "LOCKED";

export interface MockTest {
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
}

export const mockTests: MockTest[] = [
  {
    id: "neet-bio-1",
    title: "NEET Biology - Chapter 1: Living World",
    testCode: "NEET-BIO-001",
    category: "NEET",
    series: "Biology Basics",
    duration: 30,
    questions: 25,
    difficulty: "Easy",
    accessType: "FREE",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 3,
  },
  {
    id: "neet-chem-1",
    title: "NEET Chemistry - Periodic Table",
    testCode: "NEET-CHEM-001",
    category: "NEET",
    series: "Chemistry Foundations",
    duration: 45,
    questions: 30,
    difficulty: "Medium",
    accessType: "LOCKED",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 3,
  },
  {
    id: "neet-phy-1",
    title: "NEET Physics - Motion in 1D",
    testCode: "NEET-PHY-001",
    category: "NEET",
    series: "Physics Mechanics",
    duration: 40,
    questions: 20,
    difficulty: "Medium",
    accessType: "FREE",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 3,
  },
  {
    id: "neet-grand-1",
    title: "NEET Grand Test - Full Syllabus Mock 1",
    testCode: "NEET-GT-001",
    category: "NEET",
    series: "Grand Tests",
    duration: 180,
    questions: 200,
    difficulty: "Hard",
    accessType: "LOCKED",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 2,
  },
  {
    id: "jee-math-1",
    title: "JEE Maths - Quadratic Equations",
    testCode: "JEE-MATH-001",
    category: "JEE",
    series: "Algebra Series",
    duration: 35,
    questions: 20,
    difficulty: "Medium",
    accessType: "FREE",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 3,
  },
  {
    id: "jee-phy-1",
    title: "JEE Physics - Electrostatics",
    testCode: "JEE-PHY-001",
    category: "JEE",
    series: "Physics Advanced",
    duration: 50,
    questions: 25,
    difficulty: "Hard",
    accessType: "LOCKED",
    marksPerQuestion: 4,
    negativeMarks: 1,
    attemptsAllowed: 2,
  },
];

export function getTestById(id: string): MockTest | undefined {
  return mockTests.find((t) => t.id === id);
}
