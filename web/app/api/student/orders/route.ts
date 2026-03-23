import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getActivePackage,
  validateCoupon,
  findPendingOrder,
  createPaymentOrder,
  setOrderPending,
  settleOrderFree,
  listOrdersForUser,
  getOrderById,
} from "@/lib/paymentOrderDb";
import { createCashfreeOrder } from "@/lib/cashfreeApi";
import { LEGAL_VERSION } from "@/config/legal";

// POST /api/student/orders — create or resume a payment order
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { packageId?: string; couponCode?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { packageId, couponCode } = body;
  if (!packageId || typeof packageId !== "string") {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  // Load package
  const pkg = await getActivePackage(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
  }

  // Resolve coupon
  let couponId: string | null = null;
  let discountPaise = 0;
  if (couponCode && typeof couponCode === "string" && couponCode.trim().length > 0) {
    const couponResult = await validateCoupon(couponCode.trim(), pkg);
    if (!couponResult) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 422 });
    }
    couponId = couponResult.coupon.id;
    discountPaise = couponResult.discountPaise;
  }

  const grossPaise = pkg.pricePaise;
  const finalAmountPaise = Math.max(0, grossPaise - discountPaise);

  // Check for existing pending order within reuse window
  const existing = await findPendingOrder(user.id, packageId);
  if (existing) {
    if (existing.paymentSessionId) {
      return NextResponse.json({
        orderId: existing.id,
        paymentSessionId: existing.paymentSessionId,
        grossPaise: existing.grossPaise,
        netPaise: existing.finalAmountPaise,
        packageName: existing.packageName,
        resumed: true,
      });
    }
    // Existing order without session — fall through to create Cashfree order on it
  }

  // Zero-amount fast-path (free package or 100% coupon)
  if (finalAmountPaise === 0) {
    const orderId = existing?.id ?? await createPaymentOrder({
      userId: user.id,
      packageId,
      couponId,
      grossPaise,
      discountPaise,
      finalAmountPaise: 0,
      currency: pkg.currency,
      legalVersion: LEGAL_VERSION,
    });
    await settleOrderFree(orderId);
    const settled = await getOrderById(orderId);
    return NextResponse.json({
      orderId,
      status: "PAID",
      packageName: settled?.packageName ?? pkg.name,
    });
  }

  // Paid flow — create order in DB
  const orderId = existing?.id ?? await createPaymentOrder({
    userId: user.id,
    packageId,
    couponId,
    grossPaise,
    discountPaise,
    finalAmountPaise,
    currency: pkg.currency,
    legalVersion: LEGAL_VERSION,
  });

  // Build URLs (generated server-side — never trust client)
  const host = req.headers.get("host") ?? "localhost:5000";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;
  const returnUrl = `${baseUrl}/checkout/result?orderId=${orderId}`;
  const notifyUrl = `${baseUrl}/api/student/orders/webhook`;

  // Call Cashfree
  let cfOrder: Awaited<ReturnType<typeof createCashfreeOrder>>;
  try {
    cfOrder = await createCashfreeOrder({
      orderId,
      finalAmountPaise,
      currency: pkg.currency,
      userId: user.id,
      userEmail: user.email,
      userMobile: user.mobile,
      userName: user.fullName,
      returnUrl,
      notifyUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not configured")) {
      return NextResponse.json(
        { error: "Payment gateway not configured. Please contact support." },
        { status: 503 }
      );
    }
    console.error("[orders] Cashfree error:", msg);
    return NextResponse.json({ error: "Payment gateway error. Please try again." }, { status: 502 });
  }

  await setOrderPending(orderId, cfOrder.cf_order_id ?? cfOrder.order_id, cfOrder.payment_session_id);

  return NextResponse.json({
    orderId,
    paymentSessionId: cfOrder.payment_session_id,
    grossPaise,
    netPaise: finalAmountPaise,
    packageName: pkg.name,
  });
}

// GET /api/student/orders — list orders for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await listOrdersForUser(user.id);
  return NextResponse.json({ orders });
}
