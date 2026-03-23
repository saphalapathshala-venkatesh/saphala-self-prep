import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrderById,
  createRefundRequest,
  getOpenRefundRequest,
  listRefundRequestsForUser,
} from "@/lib/paymentOrderDb";

const VALID_REASON_CATEGORIES = [
  "CHANGED_MIND",
  "TECHNICAL_ISSUE",
  "CONTENT_NOT_AS_DESCRIBED",
  "DUPLICATE_PURCHASE",
  "COURSE_NOT_STARTED",
  "OTHER",
] as const;

const REASON_LABELS: Record<string, string> = {
  CHANGED_MIND: "Changed my mind",
  TECHNICAL_ISSUE: "Technical issue",
  CONTENT_NOT_AS_DESCRIBED: "Content not as described",
  DUPLICATE_PURCHASE: "Duplicate purchase",
  COURSE_NOT_STARTED: "Course not started",
  OTHER: "Other reason",
};

export { REASON_LABELS };

// POST /api/student/refund-requests — create refund request
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { orderId?: string; reasonCategory?: string; explanation?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, reasonCategory, explanation } = body;

  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }
  if (!reasonCategory || !(VALID_REASON_CATEGORIES as readonly string[]).includes(reasonCategory)) {
    return NextResponse.json(
      { error: "reasonCategory must be one of: " + VALID_REASON_CATEGORIES.join(", ") },
      { status: 400 }
    );
  }
  if (!explanation || typeof explanation !== "string" || explanation.trim().length < 10) {
    return NextResponse.json(
      { error: "explanation must be at least 10 characters" },
      { status: 400 }
    );
  }

  // Load order — must belong to this user and be PAID
  const order = await getOrderById(orderId, user.id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json(
      { error: "Only paid orders are eligible for refund" },
      { status: 422 }
    );
  }

  // Check for existing open refund request
  const existing = await getOpenRefundRequest(orderId);
  if (existing) {
    return NextResponse.json(
      { error: "A refund request already exists for this order", requestId: existing.id },
      { status: 409 }
    );
  }

  const requestId = await createRefundRequest({
    paymentOrderId: orderId,
    userId: user.id,
    packageName: order.packageName ?? "",
    packageCode: order.packageCode ?? "",
    paidPaise: order.finalAmountPaise,
    reasonCategory,
    reasonText: explanation.trim(),
  });

  return NextResponse.json({ requestId }, { status: 201 });
}

// GET /api/student/refund-requests — list refund requests for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await listRefundRequestsForUser(user.id);
  return NextResponse.json({ requests });
}
