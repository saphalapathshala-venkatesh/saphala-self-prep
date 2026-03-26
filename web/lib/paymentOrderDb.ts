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
  /** ID of the cheapest active course linked to this package via entitlementCodes. */
  linkedCourseId: string | null;
  /** Course.sellingPrice (rupees) of the linked course. Used as the authoritative display price. */
  linkedCourseSellingPrice: number | null;
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
    `SELECT
       pp.id, pp.code, pp.name, pp.description,
       pp."entitlementCodes", pp."pricePaise", pp.currency, pp."isActive",
       c.id              AS "linkedCourseId",
       c."sellingPrice"  AS "linkedCourseSellingPrice"
     FROM "ProductPackage" pp
     LEFT JOIN LATERAL (
       SELECT id, "sellingPrice"
       FROM "Course"
       WHERE "isActive" = true
         AND pp."entitlementCodes" @> ARRAY["productCategory"]::text[]
       ORDER BY "sellingPrice" ASC
       LIMIT 1
     ) c ON true
     WHERE pp."isActive" = true
     ORDER BY pp."pricePaise" ASC`
  );
}

export async function validateCoupon(
  couponCode: string,
  packageRow: ProductPackageRow,
  /** Override base amount for discount computation (paise). When present,
   *  PERCENT coupons apply against this value instead of packageRow.pricePaise.
   *  Use this when the display price is Course.sellingPrice, not package price. */
  overrideBasePaise?: number
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

  // The admin app stores timestamps in IST (UTC+5:30) as timezone-naïve values.
  // The Neon driver reads them back with a trailing Z, making them appear as UTC.
  // To compare correctly, shift "now" into the same IST naïve space:
  // nowIST = UTC + 5h30m, then compare millisecond values directly.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 h 30 min in ms
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  if (coupon.validFrom && nowIST < coupon.validFrom) return null;
  if (coupon.validUntil && nowIST > coupon.validUntil) return null;

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

  // Use override base when present (e.g., Course.sellingPrice converted to paise)
  // so PERCENT coupons compute against the price actually shown on screen.
  const basePaise = overrideBasePaise ?? packageRow.pricePaise;
  let discountPaise: number;
  if (coupon.discountType === "PERCENT") {
    discountPaise = Math.floor((basePaise * coupon.discountValue) / 100);
  } else {
    discountPaise = Math.min(coupon.discountValue, basePaise);
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
