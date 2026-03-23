import { prisma } from "@/lib/db";

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

// ── Package helpers (read-only) ────────────────────────────────────────────────

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

  if (coupon.applicableEntitlements.length > 0) {
    const applicable = packageRow.entitlementCodes.some((c) =>
      coupon.applicableEntitlements.includes(c)
    );
    if (!applicable) return null;
  }

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

// ── Order read helpers ─────────────────────────────────────────────────────────

export async function getOrderById(
  orderId: string,
  userId?: string
): Promise<PaymentOrderRow | null> {
  const whereClause = userId
    ? `po.id = $1 AND po."userId" = $2`
    : `po.id = $1`;
  const args: unknown[] = userId ? [orderId, userId] : [orderId];

  const rows = await prisma.$queryRawUnsafe<PaymentOrderRow[]>(
    `SELECT po.*, pp.name AS "packageName", pp.code AS "packageCode",
            pp.description AS "packageDescription"
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

// ── Refund read helpers ────────────────────────────────────────────────────────

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
