import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActivePackage, validateCoupon } from "@/lib/paymentOrderDb";

// GET /api/student/coupon?code=XXXX&packageId=yyy
// Read-only coupon validation for the checkout UI — no order creation, no secrets.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const packageId = searchParams.get("packageId")?.trim();

  if (!code || !packageId) {
    return NextResponse.json({ error: "code and packageId are required" }, { status: 400 });
  }

  let pkg;
  try {
    pkg = await getActivePackage(packageId);
  } catch (err) {
    console.error("[coupon] DB error (package lookup):", err);
    return NextResponse.json({ error: "Could not validate coupon. Please try again." }, { status: 500 });
  }

  if (!pkg) {
    return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
  }

  let result;
  try {
    result = await validateCoupon(code, pkg);
  } catch (err) {
    console.error("[coupon] DB error (validate):", err);
    return NextResponse.json({ error: "Could not validate coupon. Please try again." }, { status: 500 });
  }

  if (!result) {
    return NextResponse.json({ valid: false, error: "Invalid or expired coupon code" }, { status: 422 });
  }

  return NextResponse.json({
    valid: true,
    discountPaise: result.discountPaise,
    couponCode: result.coupon.code,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
  });
}
