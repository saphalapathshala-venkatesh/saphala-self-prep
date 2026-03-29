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
  // 1. Read RAW body BEFORE any parsing (required for signature verification)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    console.error("[WEBHOOK_RECEIVED] Failed to read request body");
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";

  console.log(
    `[WEBHOOK_RECEIVED] ts=${timestamp} sig=${signature.slice(0, 12)}... bodyLen=${rawBody.length}`
  );

  // 2. Verify HMAC-SHA256 signature
  //    Invalid → reject with 400 so Cashfree knows we did not accept this event.
  if (!verifyCashfreeWebhook(rawBody, timestamp, signature)) {
    console.warn(
      `[WEBHOOK_INVALID] Signature verification failed — rejecting event | ts=${timestamp}`
    );
    return NextResponse.json(
      { received: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  console.log("[WEBHOOK_VALID] Signature verified successfully");

  // 3. Parse JSON body
  let event: CashfreeWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[WEBHOOK_RECEIVED] Non-JSON body after signature passed — ignoring");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const orderId    = event?.data?.order?.order_id;
  const cfPaymentId = event?.data?.payment?.cf_payment_id;
  const eventType  = event?.type;

  console.log(
    `[WEBHOOK_RECEIVED] eventType=${eventType ?? "unknown"} orderId=${orderId ?? "none"} cfPaymentId=${cfPaymentId ?? "none"}`
  );

  if (!orderId) {
    console.warn("[WEBHOOK_RECEIVED] No orderId in payload — ignoring");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
    const cfPaymentIdStr = cfPaymentId != null ? String(cfPaymentId) : null;

    // 4. Idempotency guard — if this providerPaymentId was already processed, skip
    if (cfPaymentIdStr) {
      const existing = await prisma
        .$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "PaymentOrder"
           WHERE "providerPaymentId" = $1 AND status = 'PAID' LIMIT 1`,
          cfPaymentIdStr
        )
        .catch(() => [] as Array<{ id: string }>);

      if (existing.length > 0) {
        console.log(
          `[PAYMENT_SUCCESS] Duplicate webhook for cfPaymentId=${cfPaymentIdStr} (orderId=${orderId}) — already processed, skipping safely`
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    // 5. Mark order PAID (conditional update — idempotent, only if not already PAID)
    await prisma
      .$queryRawUnsafe(
        `UPDATE "PaymentOrder"
         SET status = 'PAID',
             "providerPaymentId" = $2,
             "paidAt" = NOW(),
             "updatedAt" = NOW()
         WHERE id = $1 AND status NOT IN ('PAID')`,
        orderId,
        cfPaymentIdStr
      )
      .catch((err) => console.error("[PAYMENT_SUCCESS] PAID update error:", err));

    // 6. Fetch userId + entitlementCodes then grant access
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
      console.log(
        `[PAYMENT_SUCCESS] orderId=${orderId} userId=${userId} cfPaymentId=${cfPaymentIdStr ?? "n/a"} codes=${codes.join(",")}`
      );
      await grantEntitlements(userId, codes, orderId);
      console.log(
        `[PAYMENT_SUCCESS] Entitlements granted for userId=${userId} | codes=${codes.join(",")}`
      );
    } else {
      console.error(
        `[PAYMENT_SUCCESS] Order not found in DB after marking PAID — orderId=${orderId}`
      );
    }
  } else if (eventType === "PAYMENT_FAILED_WEBHOOK") {
    console.log(`[WEBHOOK_RECEIVED] PAYMENT_FAILED for orderId=${orderId}`);
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
    console.log(`[WEBHOOK_RECEIVED] User dropped payment for orderId=${orderId}`);
  } else {
    console.log(`[WEBHOOK_RECEIVED] Unhandled event type=${eventType ?? "unknown"} for orderId=${orderId}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
