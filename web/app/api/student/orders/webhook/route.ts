import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCashfreeWebhook } from "@/lib/cashfreeClient";

interface CashfreeWebhookEvent {
  type?: string;
  data?: {
    order?: { order_id?: string; order_status?: string };
    payment?: { cf_payment_id?: string | number; payment_status?: string };
  };
}

async function grantEntitlements(
  userId: string,
  codes: string[],
  purchaseId: string
) {
  for (const productCode of codes) {
    await prisma.userEntitlement
      .upsert({
        where: {
          userId_productCode_tenantId: {
            userId,
            productCode,
            tenantId: "default",
          },
        },
        create: {
          userId,
          productCode,
          status: "ACTIVE",
          purchaseId,
          tenantId: "default",
        },
        update: { status: "ACTIVE", purchaseId },
      })
      .catch((err) =>
        console.error("[webhook] entitlement grant error:", productCode, err)
      );
  }
}

// POST /api/student/orders/webhook — Cashfree notifies this URL on payment events
export async function POST(req: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  // If verification fails, still return 200 so Cashfree does not retry;
  // log it for manual investigation.
  if (!verifyCashfreeWebhook(rawBody, timestamp, signature)) {
    console.warn("[webhook] Signature mismatch — ts:", timestamp);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let event: CashfreeWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[webhook] Non-JSON body received");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const orderId = event?.data?.order?.order_id;
  const cfPaymentId = event?.data?.payment?.cf_payment_id;
  const eventType = event?.type;

  if (!orderId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
    // 1. Update order to PAID
    await prisma
      .$queryRawUnsafe(
        `UPDATE "PaymentOrder"
         SET status = 'PAID',
             "providerPaymentId" = $2,
             "paidAt" = NOW(),
             "updatedAt" = NOW()
         WHERE id = $1 AND status NOT IN ('PAID')`,
        orderId,
        cfPaymentId != null ? String(cfPaymentId) : null
      )
      .catch((err) => console.error("[webhook] PAID update error:", err));

    // 2. Fetch userId + entitlementCodes to grant access
    type OrderEntRow = { userId: string; entitlementCodes: string[] };
    const rows = await prisma
      .$queryRawUnsafe<OrderEntRow[]>(
        `SELECT po."userId", pp."entitlementCodes"
         FROM "PaymentOrder" po
         JOIN "ProductPackage" pp ON pp.id = po."packageId"
         WHERE po.id = $1 LIMIT 1`,
        orderId
      )
      .catch(() => [] as OrderEntRow[]);

    if (rows[0]) {
      const { userId, entitlementCodes } = rows[0];
      const codes = Array.isArray(entitlementCodes) ? entitlementCodes : [];
      await grantEntitlements(userId, codes, orderId);
    }
  } else if (eventType === "PAYMENT_FAILED_WEBHOOK") {
    await prisma
      .$queryRawUnsafe(
        `UPDATE "PaymentOrder"
         SET status = 'FAILED', "updatedAt" = NOW()
         WHERE id = $1 AND status NOT IN ('PAID','FAILED')`,
        orderId
      )
      .catch(() => {});
  } else if (eventType === "PAYMENT_USER_DROPPED_WEBHOOK") {
    // User closed the payment modal — do not change status (they may retry)
    console.log("[webhook] User dropped payment for order:", orderId);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
