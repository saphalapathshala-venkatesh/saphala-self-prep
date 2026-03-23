import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById, getOpenRefundRequest } from "@/lib/paymentOrderDb";

// GET /api/student/orders/[id] — poll order status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let order;
  try {
    order = await getOrderById(id, user.id);
  } catch (err) {
    console.error("[orders/id] DB error:", err);
    return NextResponse.json({ error: "Could not load order. Please try again." }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check for open refund request — fail soft, not critical
  let refundRequest = null;
  if (order.status === "PAID") {
    try {
      refundRequest = await getOpenRefundRequest(order.id);
    } catch {
      // non-critical — continue without refund state
    }
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    packageName: order.packageName,
    packageCode: order.packageCode,
    grossPaise: order.grossPaise,
    discountPaise: order.discountPaise,
    netPaise: order.finalAmountPaise,
    currency: order.currency,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    openRefundRequest: refundRequest
      ? { id: refundRequest.id, status: refundRequest.status }
      : null,
  });
}
