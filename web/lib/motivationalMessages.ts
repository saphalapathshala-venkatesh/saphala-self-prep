/**
 * Motivational message pool — all positive, no criticism, no negative language.
 * Shown on the purple card when a student revisits content without earning XP.
 */

export interface MotivationalMessage {
  emoji: string;
  title: string;
  body: string;
}

const MESSAGES: MotivationalMessage[] = [
  {
    emoji: "🌟",
    title: "Keep up the good effort!",
    body: "With every effort you are moving closer to your dream. Consistent revision is what separates toppers from the rest — keep going!",
  },
  {
    emoji: "🚀",
    title: "You're building something great!",
    body: "Every hour you invest today is a vote for the future you're creating. Champions are made in moments exactly like this one.",
  },
  {
    emoji: "🔥",
    title: "Revision is your superpower!",
    body: "Revision is where averages become toppers. Every time you come back, the knowledge settles deeper — this is how mastery is built.",
  },
  {
    emoji: "💪",
    title: "Your discipline speaks volumes!",
    body: "The fact that you're here again shows the kind of dedication that winners are built from. Stay the course — you're doing it right.",
  },
  {
    emoji: "🎯",
    title: "Stay the course!",
    body: "Every page you revisit is another step toward the rank you deserve. Small consistent actions lead to extraordinary results.",
  },
  {
    emoji: "✨",
    title: "You're growing with every session!",
    body: "Growth happens in the quiet moments of revision — you're doing exactly the right thing. Trust the process and keep showing up.",
  },
  {
    emoji: "🏅",
    title: "Remarkable consistency!",
    body: "The best preparation is done brick by brick, exactly like this. Your consistency today is building your confidence for exam day.",
  },
  {
    emoji: "⭐",
    title: "Excellence is a habit!",
    body: "Success loves repetition. Every revisit reinforces your future results — you're turning knowledge into second nature.",
  },
  {
    emoji: "🌱",
    title: "You've totally got this!",
    body: "Dedication like yours is rare and powerful. The student who returns to revise is the student who tops the list. Keep that momentum alive.",
  },
  {
    emoji: "🎓",
    title: "Making every session count!",
    body: "Every session builds your edge. Today you practiced harder than most — that gap is your advantage when it matters most.",
  },
  {
    emoji: "🌠",
    title: "Incredible discipline at work!",
    body: "Top rankers aren't luckier — they simply prepared one more time than others. You're doing exactly that.",
  },
  {
    emoji: "💡",
    title: "Your commitment shines through!",
    body: "Your commitment to revision today is tomorrow's confidence in the exam hall. Every revisit is money in the bank of success.",
  },
  {
    emoji: "⚡",
    title: "Look how far you've come!",
    body: "Each revision session is proof that you take your goals seriously. That seriousness is what transforms aspirants into achievers.",
  },
  {
    emoji: "🚀",
    title: "Momentum is everything!",
    body: "You came back — that decision alone sets you apart from the crowd. The consistent ones always cross the finish line.",
  },
  {
    emoji: "🌟",
    title: "Your effort matters every time!",
    body: "Every extra session you put in is a gap your competition can't close. You're doing the work that most people skip.",
  },
  {
    emoji: "🔥",
    title: "Wonderful dedication today!",
    body: "Revision is the secret ingredient of every top result. The hours you put in here are writing your success story.",
  },
  {
    emoji: "💪",
    title: "Step by step to the top!",
    body: "Big goals are achieved in small, consistent actions — exactly what you're doing. Every step forward counts more than you know.",
  },
  {
    emoji: "🎯",
    title: "You're building your future!",
    body: "The time you invest today will pay off in ways you can't yet imagine. Keep investing in yourself — it's the best return there is.",
  },
  {
    emoji: "✨",
    title: "Champions revisit and revise!",
    body: "The greatest asset in competitive preparation is a student who keeps returning. That's you — and that's what makes the difference.",
  },
  {
    emoji: "⭐",
    title: "Strength through consistent effort!",
    body: "Every time you study again, you're choosing the outcome you want. That choice, made repeatedly, is what success is made of.",
  },
  {
    emoji: "🌱",
    title: "Stay focused — you're doing great!",
    body: "Your consistent effort is writing a story of success, one session at a time. Every chapter you revisit makes that story stronger.",
  },
  {
    emoji: "🏅",
    title: "Rise higher with every revisit!",
    body: "You're not just studying — you're building the version of yourself that achieves the goal. Each session adds another brick.",
  },
  {
    emoji: "🎓",
    title: "The effort always pays off!",
    body: "Consistent revision is the bridge between where you are and where you want to be. You're crossing that bridge right now.",
  },
  {
    emoji: "💡",
    title: "Keep shining brighter!",
    body: "Every time you sit down to review, you're reinforcing the neural pathways of success. Your brain is getting sharper with every session.",
  },
  {
    emoji: "⚡",
    title: "You're ahead of the curve!",
    body: "Most students stop at one attempt. You're going further — and that extra mile is where victories are found.",
  },
];

/**
 * Picks a motivational message deterministically from a seed string.
 * Same seed → same message every time (stable per attempt/session/chapter).
 * Different seeds → naturally varied messages across content.
 */
export function pickMotivationalMessage(seed: string): MotivationalMessage {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MESSAGES[hash % MESSAGES.length];
}
