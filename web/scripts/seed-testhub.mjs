const seedTests = [
  {
    id: "seed-free-en-neg",
    testCode: "SEED-001",
    title: "Polity & Arithmetic - Quick Test (EN)",
    accessType: "FREE",
    languageAvailable: "EN",
    negativeMarks: 0.25,
    marksPerQuestion: 1,
    duration: 10,
    questions: 10,
    attemptsAllowed: 2,
  },
  {
    id: "seed-free-both-noneg",
    testCode: "SEED-002",
    title: "Polity & Arithmetic - Bilingual (No Negative)",
    accessType: "FREE",
    languageAvailable: "BOTH",
    negativeMarks: 0,
    marksPerQuestion: 1,
    duration: 15,
    questions: 10,
    attemptsAllowed: 2,
  },
  {
    id: "seed-locked-en-neg",
    testCode: "SEED-003",
    title: "Polity & Arithmetic - Premium (EN)",
    accessType: "LOCKED",
    languageAvailable: "EN",
    negativeMarks: 0.25,
    marksPerQuestion: 1,
    duration: 10,
    questions: 8,
    attemptsAllowed: 2,
  },
  {
    id: "seed-locked-both-neg",
    testCode: "SEED-004",
    title: "Polity & Arithmetic - Premium Bilingual",
    accessType: "LOCKED",
    languageAvailable: "BOTH",
    negativeMarks: 0.25,
    marksPerQuestion: 1,
    duration: 15,
    questions: 10,
    attemptsAllowed: 2,
  },
  {
    id: "seed-locked-te-noneg",
    testCode: "SEED-005",
    title: "రాజ్యాంగం & గణితం - ప్రీమియం (TE)",
    accessType: "LOCKED",
    languageAvailable: "TE",
    negativeMarks: 0,
    marksPerQuestion: 1,
    duration: 10,
    questions: 8,
    attemptsAllowed: 2,
  },
];

console.log("\n=== Saphala TestHub Seed Data ===\n");
console.log("Created 5 seed tests in mock config:\n");
console.log(
  "┌──────────────┬────────────┬────────┬──────────┬──────┬─────┐"
);
console.log(
  "│ Test Code    │ Access     │ Lang   │ Neg Mark │ Qs   │ Min │"
);
console.log(
  "├──────────────┼────────────┼────────┼──────────┼──────┼─────┤"
);
for (const t of seedTests) {
  const code = t.testCode.padEnd(12);
  const access = t.accessType.padEnd(10);
  const lang = t.languageAvailable.padEnd(6);
  const neg = t.negativeMarks > 0 ? `${t.negativeMarks}`.padEnd(8) : "OFF".padEnd(8);
  const qs = `${t.questions}`.padEnd(4);
  const dur = `${t.duration}`.padEnd(3);
  console.log(`│ ${code} │ ${access} │ ${lang} │ ${neg} │ ${qs} │ ${dur} │`);
}
console.log(
  "└──────────────┴────────────┴────────┴──────────┴──────┴─────┘"
);

console.log("\nTest details:\n");
for (const t of seedTests) {
  console.log(`  ${t.testCode} - ${t.title}`);
  console.log(`    ID: ${t.id}`);
  console.log(`    Access: ${t.accessType} | Language: ${t.languageAvailable} | Negative: ${t.negativeMarks > 0 ? t.negativeMarks : "OFF"}`);
  console.log(`    Questions: ${t.questions} | Duration: ${t.duration}min | Marks/Q: ${t.marksPerQuestion} | Attempts: ${t.attemptsAllowed}`);
  console.log(`    Subjects: Polity, Arithmetic`);
  console.log();
}

console.log("Note: Tests are loaded from config/testhub.ts (mock data).");
console.log("      Questions are loaded from config/mockQuestions.ts.");
console.log("      Seed tests use realistic Polity & Arithmetic questions.");
console.log("      The app reads from these config files — no DB migration needed.\n");
console.log("✓ Seed complete. Restart dev server to see new tests.\n");
