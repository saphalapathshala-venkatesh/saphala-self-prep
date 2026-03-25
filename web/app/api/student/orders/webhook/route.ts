import { NextRequest, NextResponse } from "next/server";

// POST /api/student/orders/webhook
// Cashfree calls this URL (notify_url) after payment events.
// The admin app owns all payment logic — proxy the raw body to the backend.
export async function POST(req: NextRequest) {
  const backendUrl = process.env.PAYMENT_BACKEND_URL;
  if (!backendUrl) {
    // Silently accept if no backend — avoids Cashfree retry storms in unconfigured environments
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }

  // Forward Cashfree signature headers so the backend can verify the webhook
  const headersToForward: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };
  const signatureHeader = req.headers.get("x-webhook-signature");
  const timestampHeader = req.headers.get("x-webhook-timestamp");
  if (signatureHeader) headersToForward["x-webhook-signature"] = signatureHeader;
  if (timestampHeader) headersToForward["x-webhook-timestamp"] = timestampHeader;

  try {
    const res = await fetch(`${backendUrl}/api/student/orders/webhook`, {
      method: "POST",
      headers: headersToForward,
      body: rawBody,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[webhook] Backend unreachable:", err);
    // Return 200 so Cashfree doesn't retry — log the failure for investigation
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
