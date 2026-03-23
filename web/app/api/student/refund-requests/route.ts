import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listRefundRequestsForUser } from "@/lib/paymentOrderDb";

const VALID_REASON_CATEGORIES = [
  "CHANGED_MIND",
  "TECHNICAL_ISSUE",
  "CONTENT_NOT_AS_DESCRIBED",
  "DUPLICATE_PURCHASE",
  "COURSE_NOT_STARTED",
  "OTHER",
] as const;

// POST /api/student/refund-requests — proxied to payment backend (admin app owns RefundRequest persistence)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const backendUrl = process.env.PAYMENT_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Payment system not configured. Please contact support." },
      { status: 503 }
    );
  }

  let body: { orderId?: string; reasonCategory?: string; explanation?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Basic client-side guardrails before forwarding
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

  const cookie = req.headers.get("cookie") ?? "";
  const xff = req.headers.get("x-forwarded-for") ?? "";

  let res: Response;
  try {
    res = await fetch(`${backendUrl}/api/student/refund-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie && { Cookie: cookie }),
        ...(xff && { "X-Forwarded-For": xff }),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[refund-requests] Backend unreachable:", err);
    return NextResponse.json(
      { error: "Payment service unavailable. Please try again later." },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

// GET /api/student/refund-requests — read from shared DB (display only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await listRefundRequestsForUser(user.id);
  return NextResponse.json({ requests });
}
