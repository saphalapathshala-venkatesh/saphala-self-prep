import { getCurrentUser } from "@/lib/auth";
import { saveFeedback } from "@/lib/feedbackStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { attemptId, rating, comment } = body;

  if (!attemptId || !rating) {
    return Response.json({ error: "attemptId and rating are required" }, { status: 400 });
  }

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  saveFeedback({
    userId: user.id,
    attemptId,
    rating,
    comment: comment || "",
  });

  return Response.json({ ok: true });
}
