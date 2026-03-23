import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

function createId() {
  return randomUUID();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentOrderStatus = "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface PaymentOrderRow {
  id: string;
  userId: string;
  packageId: string;
  couponId: string | null;
  grossPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paymentSessionId: string | null;
  legalAcceptedAt: Date | null;
  legalVersion: string | null;
  purchaseId: string | null;
  metadata: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined
  packageName?: string;
  packageCode?: string;
  packageDescription?: string | null;
}

export interface RefundRequestRow {
  id: string;
  paymentOrderId: string;
  userId: string;
  packageName: string | null;
  packageCode: string | null;
  paidPaise: number;
  requestedPaise: number | null;
  reasonCategory: string;
  reasonText: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined
  orderStatus?: PaymentOrderStatus;
  finalAmountPaise?: number;
}

export interface ProductPackageRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entitlementCodes: string[];
  pricePaise: number;
  currency: string;
  isActive: boolean;
}

export interface CouponRow {
  id: string;
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  applicableEntitlements: string[];
  isActive: boolean;
}

export interface CashfreeConfig {
  appId: string;
  secretKey: string;
  webhookSecret: string | null;
  environment: "sandbox" | "production";
}

// ── Cashfree config ───────────────────────────────────────────────────────────

export async function getCashfreeConfig(): Promise<CashfreeConfig | null> {
  // 1) Try PaymentConfig table (admin-managed)
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      appId: string;
      secretKey: string;
      webhookSecret: string | null;
      environment: string;
    }>
  >(
    `SELECT "appId","secretKey","webhookSecret","environment"
     FROM "PaymentConfig"
     WHERE "isActive" = true AND "provider" = 'CASHFREE'
     ORDER BY "createdAt" DESC LIMIT 1`
  );
  if (rows.length > 0) {
    const r = rows[0];
    return {
      appId: r.appId,
      secretKey: r.secretKey,
      webhookSecret: r.webhookSecret,
      environment: (r.environment as string).toLowerCase() === "production" ? "production" : "sandbox",
    };
  }

  // 2) Fall back to environment variables
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) return null;

  return {
    appId,
    secretKey,
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET ?? null,
    environment: (process.env.CASHFREE_ENV ?? "sandbox").toLowerCase() === "production" ? "production" : "sandbox",
  };
}

// ── Package helpers ────────────────────────────────────────────────────────────

export async function getActivePackage(packageId: string): Promise<ProductPackageRow | null> {
  const rows = await prisma.$queryRawUnsafe<ProductPackageRow[]>(
    `SELECT id, code, name, description, "entitlementCodes", "pricePaise", currency, "isActive"
     FROM "ProductPackage"
     WHERE id = $1 AND "isActive" = true LIMIT 1`,
    packageId
  );
  return rows[0] ?? null;
}

export async function listActivePackages(): Promise<ProductPackageRow[]> {
  return prisma.$queryRawUnsafe<ProductPackageRow[]>(
    `SELECT id, code, name, description, "entitlementCodes", "pricePaise", currency, "isActive"
     FROM "ProductPackage"
     WHERE "isActive" = true
     ORDER BY "pricePaise" ASC`
  );
}

export async function validateCoupon(
  couponCode: string,
  packageRow: ProductPackageRow
): Promise<{ coupon: CouponRow; discountPaise: number } | null> {
  const rows = await prisma.$queryRawUnsafe<CouponRow[]>(
    `SELECT id, code, "discountType", "discountValue", "validFrom", "validUntil",
            "usageLimit", "perUserLimit", "applicableEntitlements", "isActive"
     FROM "Coupon"
     WHERE code = $1 AND "isActive" = true LIMIT 1`,
    couponCode.toUpperCase()
  );
  if (rows.length === 0) return null;
  const coupon = rows[0];

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return null;
  if (coupon.validUntil && now > coupon.validUntil) return null;

  // Check applicability
  if (coupon.applicableEntitlements.length > 0) {
    const applicable = packageRow.entitlementCodes.some((c) =>
      coupon.applicableEntitlements.includes(c)
    );
    if (!applicable) return null;
  }

  // Check usage limit
  if (coupon.usageLimit !== null) {
    const [{ count }] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM "PaymentOrder" WHERE "couponId" = $1 AND status = 'PAID'`,
      coupon.id
    );
    if (Number(count) >= coupon.usageLimit) return null;
  }

  let discountPaise: number;
  if (coupon.discountType === "PERCENT") {
    discountPaise = Math.floor((packageRow.pricePaise * coupon.discountValue) / 100);
  } else {
    discountPaise = Math.min(coupon.discountValue, packageRow.pricePaise);
  }

  return { coupon, discountPaise };
}

// ── Order helpers ─────────────────────────────────────────────────────────────

const PENDING_REUSE_MINUTES = 15;

export async function findPendingOrder(
  userId: string,
  packageId: string
): Promise<PaymentOrderRow | null> {
  const rows = await prisma.$queryRawUnsafe<PaymentOrderRow[]>(
    `SELECT po.*, pp.name AS "packageName", pp.code AS "packageCode", pp.description AS "packageDescription"
     FROM "PaymentOrder" po
     JOIN "ProductPackage" pp ON pp.id = po."packageId"
     WHERE po."userId" = $1
       AND po."packageId" = $2
       AND po.status IN ('CREATED','PENDING')
       AND po."createdAt" > NOW() - INTERVAL '${PENDING_REUSE_MINUTES} minutes'
     ORDER BY po."createdAt" DESC LIMIT 1`,
    userId,
    packageId
  );
  return rows[0] ?? null;
}

export async function createPaymentOrder(params: {
  userId: string;
  packageId: string;
  couponId: string | null;
  grossPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
  currency: string;
  legalVersion: string;
}): Promise<string> {
  const id = createId();
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PaymentOrder"
       (id, "userId", "packageId", "couponId", "grossPaise", "discountPaise",
        "finalAmountPaise", currency, status, provider, "legalAcceptedAt", "legalVersion",
        "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'CREATED','CASHFREE',$9,$10,$11,$11)`,
    id,
    params.userId,
    params.packageId,
    params.couponId,
    params.grossPaise,
    params.discountPaise,
    params.finalAmountPaise,
    params.currency,
    now,
    params.legalVersion,
    now
  );
  return id;
}

export async function setOrderPending(
  orderId: string,
  providerOrderId: string,
  paymentSessionId: string
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "PaymentOrder"
     SET status='PENDING', "providerOrderId"=$1, "paymentSessionId"=$2, "updatedAt"=NOW()
     WHERE id=$3`,
    providerOrderId,
    paymentSessionId,
    orderId
  );
}

export async function settleOrder(
  providerOrderId: string,
  providerPaymentId: string
): Promise<PaymentOrderRow | null> {
  const rows = await prisma.$queryRawUnsafe<PaymentOrderRow[]>(
    `SELECT po.*, pp.name AS "packageName", pp.code AS "packageCode",
            pp.description AS "packageDescription", pp."entitlementCodes"
     FROM "PaymentOrder" po
     JOIN "ProductPackage" pp ON pp.id = po."packageId"
     WHERE po."providerOrderId" = $1 AND po.status IN ('CREATED','PENDING')
     LIMIT 1`,
    providerOrderId
  );
  if (rows.length === 0) return null;

  const order = rows[0];

  // Grant entitlements + create Purchase record
  await prisma.$transaction(async (tx) => {
    // Avoid duplicate settlement
    const existing = await tx.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM "PaymentOrder" WHERE id=$1 AND status='PAID'`,
      order.id
    );
    if (Number(existing[0].count) > 0) return;

    // Create Purchase record
    const purchaseId = createId();
    const now = new Date();
    await tx.$executeRawUnsafe(
      `INSERT INTO "Purchase"
         (id, "userId", "packageId", "couponId", stream, currency, "grossPaise", "feePaise", "netPaise",
          "legalAcceptedAt", "legalVersion", "createdAt")
       VALUES ($1,$2,$3,$4,'SELFPREP_HTML',$5,$6,0,$7,$8,$9,$10)`,
      purchaseId,
      order.userId,
      order.packageId,
      order.couponId,
      order.currency,
      order.grossPaise,
      order.finalAmountPaise,
      order.legalAcceptedAt,
      order.legalVersion,
      now
    );

    // Create UserEntitlement records
    const entitlementCodes: string[] = (rows[0] as unknown as { entitlementCodes: string[] }).entitlementCodes ?? [];
    for (const code of entitlementCodes) {
      const entId = createId();
      await tx.$executeRawUnsafe(
        `INSERT INTO "UserEntitlement" (id, "userId", "productCode", status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,'ACTIVE',$4,$4)
         ON CONFLICT DO NOTHING`,
        entId,
        order.userId,
        code,
        now
      );
    }

    // Mark order PAID
    await tx.$executeRawUnsafe(
      `UPDATE "PaymentOrder"
       SET status='PAID', "providerPaymentId"=$1, "purchaseId"=$2, "paidAt"=$3, "updatedAt"=$3
       WHERE id=$4`,
      providerPaymentId,
      purchaseId,
      now,
      order.id
    );
  });

  return { ...order, status: "PAID" };
}

export async function settleOrderFree(orderId: string): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<
    Array<PaymentOrderRow & { entitlementCodes: string[] }>
  >(
    `SELECT po.*, pp."entitlementCodes", pp.name AS "packageName", pp.code AS "packageCode"
     FROM "PaymentOrder" po
     JOIN "ProductPackage" pp ON pp.id = po."packageId"
     WHERE po.id = $1 LIMIT 1`,
    orderId
  );
  if (rows.length === 0) return;
  const order = rows[0];

  await prisma.$transaction(async (tx) => {
    const purchaseId = createId();
    const now = new Date();

    await tx.$executeRawUnsafe(
      `INSERT INTO "Purchase"
         (id, "userId", "packageId", "couponId", stream, currency, "grossPaise", "feePaise", "netPaise",
          "legalAcceptedAt", "legalVersion", "createdAt")
       VALUES ($1,$2,$3,$4,'SELFPREP_HTML',$5,$6,0,$7,$8,$9,$10)`,
      purchaseId,
      order.userId,
      order.packageId,
      order.couponId,
      order.currency,
      order.grossPaise,
      order.finalAmountPaise,
      order.legalAcceptedAt,
      order.legalVersion,
      now
    );

    for (const code of order.entitlementCodes ?? []) {
      const entId = createId();
      await tx.$executeRawUnsafe(
        `INSERT INTO "UserEntitlement" (id, "userId", "productCode", status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,'ACTIVE',$4,$4)
         ON CONFLICT DO NOTHING`,
        entId,
        order.userId,
        code,
        now
      );
    }

    await tx.$executeRawUnsafe(
      `UPDATE "PaymentOrder"
       SET status='PAID', "purchaseId"=$1, "paidAt"=$2, "updatedAt"=$2
       WHERE id=$3`,
      purchaseId,
      now,
      orderId
    );
  });
}

export async function failOrder(orderId: string, reason?: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "PaymentOrder"
     SET status='FAILED', metadata=COALESCE(metadata,'{}') || $1::jsonb, "updatedAt"=NOW()
     WHERE id=$2`,
    JSON.stringify({ failureReason: reason ?? "Unknown" }),
    orderId
  );
}

export async function getOrderById(
  orderId: string,
  userId?: string
): Promise<(PaymentOrderRow & { entitlementCodes: string[] }) | null> {
  const whereClause = userId
    ? `po.id = $1 AND po."userId" = $2`
    : `po.id = $1`;
  const args: unknown[] = userId ? [orderId, userId] : [orderId];

  const rows = await prisma.$queryRawUnsafe<
    Array<PaymentOrderRow & { entitlementCodes: string[] }>
  >(
    `SELECT po.*, pp.name AS "packageName", pp.code AS "packageCode",
            pp.description AS "packageDescription", pp."entitlementCodes"
     FROM "PaymentOrder" po
     JOIN "ProductPackage" pp ON pp.id = po."packageId"
     WHERE ${whereClause} LIMIT 1`,
    ...args
  );
  return rows[0] ?? null;
}

export async function listOrdersForUser(userId: string): Promise<PaymentOrderRow[]> {
  return prisma.$queryRawUnsafe<PaymentOrderRow[]>(
    `SELECT po.*, pp.name AS "packageName", pp.code AS "packageCode",
            pp.description AS "packageDescription"
     FROM "PaymentOrder" po
     JOIN "ProductPackage" pp ON pp.id = po."packageId"
     WHERE po."userId" = $1
     ORDER BY po."createdAt" DESC`,
    userId
  );
}

// ── Refund helpers ────────────────────────────────────────────────────────────

export async function createRefundRequest(params: {
  paymentOrderId: string;
  userId: string;
  packageName: string;
  packageCode: string;
  paidPaise: number;
  reasonCategory: string;
  reasonText: string;
}): Promise<string> {
  const id = createId();
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "RefundRequest"
       (id, "paymentOrderId", "userId", "packageName", "packageCode",
        "paidPaise", "reasonCategory", "reasonText", status, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'REQUESTED',$9,$9)`,
    id,
    params.paymentOrderId,
    params.userId,
    params.packageName,
    params.packageCode,
    params.paidPaise,
    params.reasonCategory,
    params.reasonText,
    now
  );
  return id;
}

export async function getOpenRefundRequest(
  paymentOrderId: string
): Promise<RefundRequestRow | null> {
  const rows = await prisma.$queryRawUnsafe<RefundRequestRow[]>(
    `SELECT * FROM "RefundRequest"
     WHERE "paymentOrderId" = $1 AND status IN ('REQUESTED','UNDER_REVIEW')
     LIMIT 1`,
    paymentOrderId
  );
  return rows[0] ?? null;
}

export async function listRefundRequestsForUser(
  userId: string
): Promise<RefundRequestRow[]> {
  return prisma.$queryRawUnsafe<RefundRequestRow[]>(
    `SELECT rr.*, po.status AS "orderStatus", po."finalAmountPaise"
     FROM "RefundRequest" rr
     JOIN "PaymentOrder" po ON po.id = rr."paymentOrderId"
     WHERE rr."userId" = $1
     ORDER BY rr."createdAt" DESC`,
    userId
  );
}
