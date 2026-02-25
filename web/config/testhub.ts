export interface MockTest {
  id: string;
  title: string;
  category: string;
  series: string;
  duration: number;
  questions: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

export const mockTests: MockTest[] = [
  {
    id: "neet-bio-1",
    title: "NEET Biology - Chapter 1: Living World",
    category: "NEET",
    series: "Biology Basics",
    duration: 30,
    questions: 25,
    difficulty: "Easy",
  },
  {
    id: "neet-chem-1",
    title: "NEET Chemistry - Periodic Table",
    category: "NEET",
    series: "Chemistry Foundations",
    duration: 45,
    questions: 30,
    difficulty: "Medium",
  },
  {
    id: "neet-phy-1",
    title: "NEET Physics - Motion in 1D",
    category: "NEET",
    series: "Physics Mechanics",
    duration: 40,
    questions: 20,
    difficulty: "Medium",
  },
  {
    id: "neet-grand-1",
    title: "NEET Grand Test - Full Syllabus Mock 1",
    category: "NEET",
    series: "Grand Tests",
    duration: 180,
    questions: 200,
    difficulty: "Hard",
  },
  {
    id: "jee-math-1",
    title: "JEE Maths - Quadratic Equations",
    category: "JEE",
    series: "Algebra Series",
    duration: 35,
    questions: 20,
    difficulty: "Medium",
  },
  {
    id: "jee-phy-1",
    title: "JEE Physics - Electrostatics",
    category: "JEE",
    series: "Physics Advanced",
    duration: 50,
    questions: 25,
    difficulty: "Hard",
  },
];

export function getTestById(id: string): MockTest | undefined {
  return mockTests.find((t) => t.id === id);
}
