export interface Quote {
  text: string;
  author: string;
}

export const quotes: Quote[] = [
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
    text: "All birds find shelter during a rain. But eagle avoids rain by flying above the clouds. Problems are common, but attitude makes the difference.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "To succeed in your mission, you must have single-minded devotion to your goal.",
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
  {
    text: "Look at the sky. We are not alone. The whole universe is friendly to us and conspires only to give the best to those who dream and work.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Failure will never overtake me if my determination to succeed is strong enough.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "It is very easy to defeat someone, but it is very hard to win someone.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Don't read success stories. Read failure stories as they teach you how to win.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Without your involvement you can't succeed. With your involvement you can't fail.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "A dream is not that which you see while sleeping, it is that which does not let you sleep.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
  {
    text: "Educationists should build the capacities of the spirit of inquiry, creativity, entrepreneurial and moral leadership among students.",
    author: "Dr. A.P.J. Abdul Kalam",
  },
];

/**
 * Returns a deterministic quote for the current calendar day.
 * The quote is stable for the entire day and changes at midnight.
 * No randomness — same quote for every request on the same date.
 */
export function getDailyQuote(): Quote {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  return quotes[dayOfYear % quotes.length];
}
