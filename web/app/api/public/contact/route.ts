import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/resend";

// Simple in-memory rate limit: max 3 submissions per IP per 10 minutes
const ipTimestamps = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 3;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipTimestamps.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  ipTimestamps.set(ip, timestamps);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Honeypot check — bots fill hidden fields that real users never see
    const body = await req.json();
    if (body._hp && String(body._hp).length > 0) {
      // Silently succeed so bots don't know they were caught
      return NextResponse.json({ success: true, message: "Thank you! We will get back to you soon." });
    }

    const { name, email, phone, message } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });
    }

    // Rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const result = await sendContactEmail({
      senderName: name.trim(),
      senderEmail: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message.trim(),
    });

    if (!result.ok) {
      console.error("[contact] Email send failed:", result.error);
      // Still return success to the user — we don't want a Resend outage
      // to block legit submissions; log is enough for manual follow-up.
    }

    console.log("[Contact Form Submission]", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! We will get back to you soon.",
    });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
