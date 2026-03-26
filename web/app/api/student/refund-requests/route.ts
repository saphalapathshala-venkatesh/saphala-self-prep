import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listRefundRequestsForUser, getOrderById } from "@/lib/paymentOrderDb";

const VALID_REASON_CATEGORIES = [
  "CHANGED_MIND",
  "TECHNICAL_ISSUE",
  "CONTENT_NOT_AS_DESCRIBED",
  "DUPLICATE_PURCHASE",
  "COURSE_NOT_STARTED",
  "OTHER",
] as const;

// POST /api/student/refund-requests — create a refund request
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

  // 1. Verify order belongs to the user and is PAID
  const order = await getOrderById(orderId, user.id).catch(() => null);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json(
      { error: "Refunds can only be requested for paid orders" },
      { status: 400 }
    );
  }

  // 2. Check if an open refund request already exists
  type RefundCheck = { id: string; status: string };
  const existing = await prisma
    .$queryRawUnsafe<RefundCheck[]>(
      `SELECT id, status FROM "RefundRequest"
       WHERE "paymentOrderId" = $1 AND status IN ('REQUESTED','UNDER_REVIEW')
       LIMIT 1`,
      orderId
    )
    .catch(() => [] as RefundCheck[]);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A refund request for this order is already under review" },
      { status: 409 }
    );
  }

  // 3. Refund eligibility gate (≤3 days since payment)
  if (order.paidAt) {
    const daysSincePaid =
      (Date.now() - new Date(order.paidAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePaid > 3) {
      return NextResponse.json(
        { error: "Refund window has expired. Refunds are only accepted within 3 days of purchase." },
        { status: 400 }
      );
    }
  }

  // 4. Insert refund request (include package info from joined order row)
  const refundId = `RFD-${randomUUID()}`;
  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "RefundRequest"
         (id, "paymentOrderId", "userId", "packageId", "packageName", "packageCode",
          "paidPaise", "reasonCategory", "reasonText",
          status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'REQUESTED', NOW(), NOW())`,
      refundId,
      orderId,
      user.id,
      order.packageId,
      order.packageName ?? null,
      order.packageCode ?? null,
      order.finalAmountPaise,
      reasonCategory,
      explanation.trim()
    );
  } catch (err) {
    console.error("[refund-requests] Insert error:", err);
    return NextResponse.json(
      { error: "Could not submit refund request. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: refundId, status: "REQUESTED" },
    { status: 201 }
  );
}

// GET /api/student/refund-requests — read from shared DB
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let requests;
  try {
    requests = await listRefundRequestsForUser(user.id);
  } catch (err) {
    console.error("[refund-requests] DB error:", err);
    return NextResponse.json(
      { error: "Could not load refund requests. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ requests });
}
