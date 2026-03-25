import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizeIdentifier } from "@/lib/validation";
import { randomBytes } from "crypto";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lookupUser(normalized: { type: "email" | "mobile"; value: string }) {
  return normalized.type === "email"
    ? prisma.user.findUnique({ where: { email: normalized.value } })
    : prisma.user.findUnique({ where: { mobile: normalized.value } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request format." },
        { status: 400 }
      );
    }

    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/Mobile and password are required." },
        { status: 400 }
      );
    }

    const normalized = normalizeIdentifier(identifier);

    // User lookup — retry once on transient connection failure
    let user;
    try {
      user = await lookupUser(normalized);
    } catch (dbErr) {
      console.error("[login] DB lookup failed (attempt 1):", dbErr);
      try {
        await sleep(700);
        user = await lookupUser(normalized);
        console.log("[login] DB lookup succeeded on retry");
      } catch (retryErr) {
        console.error("[login] DB lookup failed (attempt 2):", retryErr);
        return NextResponse.json(
          { error: "Login failed. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    if (!user) {
      console.log(`[login] No user found for identifier type=${normalized.type}`);
      return NextResponse.json(
        { error: "No account found. Please create your account first.", code: "USER_NOT_FOUND" },
        { status: 401 }
      );
    }

    // Soft-deleted account
    if (user.deletedAt) {
      console.log(`[login] Rejected — user ${user.id} is soft-deleted`);
      return NextResponse.json(
        { error: "Incorrect email/mobile or password." },
        { status: 401 }
      );
    }

    // Blocked by admin
    if (user.isBlocked || user.infringementBlocked) {
      console.log(`[login] Rejected — user ${user.id} is blocked (isBlocked=${user.isBlocked}, infringementBlocked=${user.infringementBlocked})`);
      return NextResponse.json(
        {
          error: "Your account has been blocked. Please contact support.",
          code: "ACCOUNT_BLOCKED",
        },
        { status: 403 }
      );
    }

    // Deactivated
    if (!user.isActive) {
      console.log(`[login] Rejected — user ${user.id} is inactive`);
      return NextResponse.json(
        {
          error: "Your account is inactive. Please contact support.",
          code: "ACCOUNT_INACTIVE",
        },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      console.error(`[login] User ${user.id} has no password hash`);
      return NextResponse.json(
        { error: "Account setup incomplete. Please contact support." },
        { status: 500 }
      );
    }

    const isBcryptHash = user.passwordHash.startsWith("$2");
    let passwordValid = false;

    try {
      if (isBcryptHash) {
        passwordValid = await bcrypt.compare(password, user.passwordHash);
      } else {
        // Plain-text fallback (should not exist for new accounts)
        passwordValid = user.passwordHash === password;
        if (passwordValid) {
          const newHash = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          }).catch((e) => console.error("[login] Hash upgrade failed:", e));
        }
      }
    } catch (bcryptErr) {
      console.error("[login] Password verification failed:", bcryptErr);
      return NextResponse.json(
        { error: "Login failed. Please try again." },
        { status: 500 }
      );
    }

    if (!passwordValid) {
      console.log(`[login] Rejected — wrong password for user ${user.id}`);
      return NextResponse.json(
        { error: "Incorrect password. Please try again.", code: "WRONG_PASSWORD" },
        { status: 401 }
      );
    }

    // ── Single Device Policy (true device-binding) ──────────────────────────
    // Admins with allowMultiDevice=true are exempt from device binding.
    const deviceId = request.headers.get("X-Device-Id")?.trim() || "";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";
    const userAgent = request.headers.get("user-agent") || "";

    if (!user.allowMultiDevice) {
      if (deviceId) {
        // ── Device-binding path ─────────────────────────────────────────────
        // Fetch the primary registered device for this user.
        let devices: Array<{ id: string; deviceKey: string }> = [];
        try {
          devices = await prisma.$queryRawUnsafe<Array<{ id: string; deviceKey: string }>>(
            `SELECT id, "deviceKey" FROM "UserDevice"
             WHERE "userId" = $1 AND "isActive" = true AND "isBlocked" = false
             ORDER BY "firstSeenAt" ASC`,
            user.id
          );
        } catch (devErr) {
          console.error("[login] UserDevice query failed:", devErr);
          // Non-fatal — fall through and allow login; device binding is best-effort on DB error
        }

        const primaryDevice = devices[0];

        if (!primaryDevice) {
          // First-ever login — permanently bind this device to the account
          const deviceRowId = randomBytes(12).toString("hex");
          try {
            await prisma.$queryRawUnsafe(
              `INSERT INTO "UserDevice" (id, "userId", "deviceKey", "deviceType", "userAgent", "ipAddressLast", "updatedAt")
               VALUES ($1, $2, $3, 'UNKNOWN'::"DeviceType", $4, $5, NOW())
               ON CONFLICT ("userId", "deviceKey") DO UPDATE
               SET "lastSeenAt" = NOW(), "updatedAt" = NOW(), "ipAddressLast" = EXCLUDED."ipAddressLast"`,
              deviceRowId,
              user.id,
              deviceId,
              userAgent,
              ip
            );
            console.log(`[login] Device bound (first login) — user ${user.id}, device …${deviceId.slice(-8)}`);
          } catch (insertErr) {
            console.error("[login] Device registration failed (non-fatal):", insertErr);
          }
        } else if (primaryDevice.deviceKey === deviceId) {
          // Same registered device — allow and refresh timestamps
          try {
            await prisma.$queryRawUnsafe(
              `UPDATE "UserDevice" SET "lastSeenAt" = NOW(), "updatedAt" = NOW(), "ipAddressLast" = $2 WHERE id = $1`,
              primaryDevice.id,
              ip
            );
          } catch (updateErr) {
            console.error("[login] Device lastSeenAt update failed (non-fatal):", updateErr);
          }
          console.log(`[login] Same-device login — user ${user.id}`);
        } else {
          // Different device — permanently blocked
          console.log(
            `[login] DEVICE_BLOCKED — user ${user.id}, ` +
            `registered …${primaryDevice.deviceKey.slice(-8)}, ` +
            `attempted …${deviceId.slice(-8)}`
          );
          return NextResponse.json(
            {
              error:
                "This account is already linked to another device. For account protection and access control, login on a new device is not allowed. Please use your registered device or contact support/admin if a reset is genuinely required.",
              code: "DEVICE_BLOCKED",
            },
            { status: 409 }
          );
        }
      } else {
        // ── No deviceId sent — fallback to active-session check ────────────
        // This covers API clients or edge cases where localStorage is unavailable.
        const existingSession = await prisma.session.findFirst({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() },
            revokedAt: null,
          },
          select: { id: true },
        });
        if (existingSession) {
          console.log(`[login] ACTIVE_SESSION_EXISTS (no deviceId header) — user ${user.id}`);
          return NextResponse.json(
            {
              error:
                "This account is already active on another device. Please sign out from your other device first, or contact support.",
              code: "ACTIVE_SESSION_EXISTS",
            },
            { status: 409 }
          );
        }
      }
    } else {
      console.log(`[login] Multi-device allowed — skipping device check for user ${user.id}`);
    }
    // ── End Single Device Policy ────────────────────────────────────────────

    // Session creation — retry once on transient failure
    let cookie;
    try {
      cookie = await createSessionCookie(user.id);
    } catch (sessionErr) {
      console.error("[login] Session creation failed (attempt 1):", sessionErr);
      try {
        await sleep(700);
        cookie = await createSessionCookie(user.id);
        console.log("[login] Session creation succeeded on retry");
      } catch (retryErr) {
        console.error("[login] Session creation failed (attempt 2):", retryErr);
        return NextResponse.json(
          { error: "Login failed. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    console.log(`[login] Success — user ${user.id} (${user.role})`);
    const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    console.error("[login] Unhandled error:", e);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
