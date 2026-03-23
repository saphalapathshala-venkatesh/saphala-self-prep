import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/paymentOrderDb";

// POST /api/student/orders — proxied to payment backend (admin app owns order creation + Cashfree)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const backendUrl = process.env.PAYMENT_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Payment system not configured. Please contact support." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Forward cookie so the backend can authenticate the session via shared DB
  const cookie = req.headers.get("cookie") ?? "";
  const xff = req.headers.get("x-forwarded-for") ?? "";

  let res: Response;
  try {
    res = await fetch(`${backendUrl}/api/student/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie && { Cookie: cookie }),
        ...(xff && { "X-Forwarded-For": xff }),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[orders] Backend unreachable:", err);
    return NextResponse.json(
      { error: "Payment service unavailable. Please try again later." },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

// GET /api/student/orders — read from shared DB (display only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await listOrdersForUser(user.id);
  return NextResponse.json({ orders });
}
