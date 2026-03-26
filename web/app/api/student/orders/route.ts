import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getActivePackage,
  validateCoupon,
  listOrdersForUser,
} from "@/lib/paymentOrderDb";
import {
  createCashfreeOrder,
  getCashfreeMode,
  sanitizePhone,
} from "@/lib/cashfreeClient";
import { LEGAL_VERSION } from "@/config/legal";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function findResumableOrder(
  userId: string,
  packageId: string,
  finalAmountPaise: number
): Promise<{ id: string; paymentSessionId: string | null } | null> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const rows = await prisma
    .$queryRawUnsafe<Array<{ id: string; paymentSessionId: string | null }>>(
      `SELECT id, "paymentSessionId" FROM "PaymentOrder"
       WHERE "userId" = $1 AND "packageId" = $2 AND "finalAmountPaise" = $3
         AND status IN ('CREATED','PENDING') AND "createdAt" > $4
       ORDER BY "createdAt" DESC LIMIT 1`,
      userId,
      packageId,
      finalAmountPaise,
      cutoff
    )
    .catch(() => []);
  return rows[0] ?? null;
}

async function insertOrderRecord(p: {
  orderId: string;
  userId: string;
  packageId: string;
  couponId: string | null;
  grossPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  currency: string;
  status: string;
  providerOrderId: string | null;
  paymentSessionId: string | null;
}) {
  await prisma.$queryRawUnsafe(
    `INSERT INTO "PaymentOrder"
       (id, "userId", "packageId", "couponId",
        "grossPaise", "discountPaise", "finalAmountPaise",
        currency, status, provider,
        "providerOrderId", "paymentSessionId",
        "legalVersion", "legalAcceptedAt",
        "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW(),NOW())`,
    p.orderId,
    p.userId,
    p.packageId,
    p.couponId,
    p.grossPaise,
    p.discountPaise,
    p.finalAmountPaise,
    p.currency,
    p.status,
    "CASHFREE",
    p.providerOrderId,
    p.paymentSessionId,
    LEGAL_VERSION
  );
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
        console.error("[orders] entitlement grant error:", productCode, err)
      );
  }
}

// ── POST /api/student/orders ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { packageId?: string; couponCode?: string; courseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { packageId, couponCode, courseId } = body;
  if (!packageId) {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  // 1. Validate package
  const pkg = await getActivePackage(packageId).catch(() => null);
  if (!pkg) {
    return NextResponse.json(
      { error: "Package not found or no longer available" },
      { status: 404 }
    );
  }

  // 2. Determine base price — course selling price takes priority over package price
  let basePricePaise = pkg.pricePaise;
  if (courseId) {
    const safeId = courseId.replace(/'/g, "''");
    type CoursePriceRow = { sellingPrice: number | null };
    const rows = await prisma
      .$queryRawUnsafe<CoursePriceRow[]>(
        `SELECT "sellingPrice" FROM "Course"
         WHERE id = '${safeId}' AND "isActive" = true LIMIT 1`
      )
      .catch(() => [] as CoursePriceRow[]);
    const sp = rows[0]?.sellingPrice;
    if (sp != null && sp > 0) {
      basePricePaise = Math.round(sp * 100);
    }
  }

  // 3. Coupon discount
  let discountPaise = 0;
  let couponId: string | null = null;
  if (couponCode) {
    const result = await validateCoupon(
      couponCode,
      pkg,
      basePricePaise
    ).catch(() => null);
    if (result) {
      discountPaise = result.discountPaise;
      couponId = result.coupon.id;
    }
  }

  const grossPaise = basePricePaise;
  const finalAmountPaise = Math.max(0, grossPaise - discountPaise);

  // 4. Zero-amount fast path (free or 100% coupon)
  if (finalAmountPaise === 0) {
    const orderId = `ORD-${randomUUID()}`;
    await insertOrderRecord({
      orderId,
      userId: user.id,
      packageId: pkg.id,
      couponId,
      grossPaise,
      discountPaise,
      finalAmountPaise: 0,
      currency: pkg.currency,
      status: "PAID",
      providerOrderId: null,
      paymentSessionId: null,
    });
    await grantEntitlements(user.id, pkg.entitlementCodes, orderId);
    return NextResponse.json({ orderId, status: "PAID" });
  }

  // 5. Resume existing open order (within 30 min) to avoid duplicate Cashfree orders
  const existing = await findResumableOrder(user.id, packageId, finalAmountPaise);
  if (existing?.paymentSessionId) {
    return NextResponse.json({
      orderId: existing.id,
      paymentSessionId: existing.paymentSessionId,
    });
  }

  // 6. Build absolute URLs from the incoming request
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const siteUrl = `${proto}://${host}`;

  const orderId = `ORD-${randomUUID()}`;

  // 7. Create order in Cashfree (server-side only — keys never leave this file)
  let paymentSessionId: string;
  let cfOrderId: string | number;
  try {
    const result = await createCashfreeOrder({
      orderId,
      amountRupees: finalAmountPaise / 100,
      currency: pkg.currency,
      customerId: user.id,
      customerName: user.fullName ?? user.email ?? "Student",
      customerEmail: user.email ?? `cf_${user.id}@saphala.in`,
      customerPhone: sanitizePhone(user.mobile),
      returnUrl: `${siteUrl}/checkout/result?orderId=${orderId}`,
      notifyUrl: `${siteUrl}/api/student/orders/webhook`,
    });
    paymentSessionId = result.paymentSessionId;
    cfOrderId = result.cfOrderId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not configured")) {
      return NextResponse.json(
        { error: "Payment system not configured. Please contact support." },
        { status: 503 }
      );
    }
    console.error("[orders] Cashfree error:", msg);
    return NextResponse.json(
      { error: "Could not initialise payment. Please try again." },
      { status: 502 }
    );
  }

  // 8. Persist order record
  await insertOrderRecord({
    orderId,
    userId: user.id,
    packageId: pkg.id,
    couponId,
    grossPaise,
    discountPaise,
    finalAmountPaise,
    currency: pkg.currency,
    status: "CREATED",
    providerOrderId: String(cfOrderId),
    paymentSessionId,
  });

  // Return only safe data — no credentials, no server secrets
  return NextResponse.json({ orderId, paymentSessionId });
}

// ── GET /api/student/orders ────────────────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rawOrders;
  try {
    rawOrders = await listOrdersForUser(user.id);
  } catch (err) {
    console.error("[orders] DB error:", err);
    return NextResponse.json(
      { error: "Could not load orders. Please try again." },
      { status: 500 }
    );
  }

  const orders = rawOrders.map((o) => ({
    id: o.id,
    status: o.status,
    packageName: o.packageName,
    packageCode: o.packageCode,
    packageDescription: o.packageDescription,
    grossPaise: o.grossPaise,
    discountPaise: o.discountPaise,
    netPaise: o.finalAmountPaise,
    currency: o.currency,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
  }));

  return NextResponse.json({ orders });
}
