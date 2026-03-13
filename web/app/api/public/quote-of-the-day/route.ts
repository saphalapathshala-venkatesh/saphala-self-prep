import { NextResponse } from "next/server";

const quotes = [
  {
    text: "Dream is not that which you see while sleeping, it is something that does not let you sleep.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "You have to dream before your dreams can come true.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Excellence is a continuous process and not an accident.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Don't take rest after your first victory because if you fail in second, more lips are waiting to say that your first victory was just luck.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "All birds find shelter during a rain. But eagle avoids rain by flying above the clouds.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "To succeed in your mission, you must have single-minded devotion to your goal.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "One best book is equal to a hundred good friends, but one good friend is equal to a library.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Confidence and hard work is the best medicine to kill the disease called failure.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Thinking is the capital, enterprise is the way, and hard work is the solution.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "If you want to shine like a sun, first burn like a sun.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Learning gives creativity, creativity leads to thinking, thinking provides knowledge, and knowledge makes you great.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Man needs difficulties in life because they are necessary to enjoy success.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
];

export async function GET() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quote = quotes[dayOfYear % quotes.length];
  return NextResponse.json(quote);
}
