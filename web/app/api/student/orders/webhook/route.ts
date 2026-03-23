import { NextRequest, NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfreeApi";
import { settleOrder, failOrder } from "@/lib/paymentOrderDb";

// POST /api/student/orders/webhook — Cashfree notify_url callback
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  const valid = await verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
  if (!valid) {
    console.warn("[webhook] Invalid Cashfree signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = (payload.type as string) ?? "";
  const data = (payload.data as Record<string, unknown>) ?? {};
  const orderData = (data.order as Record<string, unknown>) ?? {};
  const paymentData = (data.payment as Record<string, unknown>) ?? {};

  const providerOrderId = String(orderData.order_id ?? "");
  const paymentStatus = String(paymentData.payment_status ?? "").toUpperCase();
  const cfPaymentId = String(paymentData.cf_payment_id ?? paymentData.payment_id ?? "");

  if (!providerOrderId) {
    return NextResponse.json({ received: true });
  }

  if (type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
    await settleOrder(providerOrderId, cfPaymentId || `cf_${providerOrderId}`);
  } else if (
    type === "PAYMENT_FAILED_WEBHOOK" ||
    paymentStatus === "FAILED" ||
    paymentStatus === "CANCELLED"
  ) {
    const reason = String(paymentData.payment_message ?? "Payment failed");
    // Find order by providerOrderId and fail it
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "PaymentOrder" WHERE "providerOrderId" = $1 LIMIT 1`,
      providerOrderId
    );
    if (rows.length > 0) {
      await failOrder(rows[0].id, reason);
    }
  }

  return NextResponse.json({ received: true });
}
