export interface AttemptFeedback {
  id: string;
  attemptId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const feedbacks: AttemptFeedback[] = [];

export function saveFeedback(data: {
  userId: string;
  attemptId: string;
  rating: number;
  comment: string;
}): AttemptFeedback {
  const feedback: AttemptFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
  };
  feedbacks.push(feedback);
  return feedback;
}

export function getFeedbackForAttempt(attemptId: string): AttemptFeedback | undefined {
  return feedbacks.find((f) => f.attemptId === attemptId);
}
