/**
 * Server-only Cashfree PG integration.
 * NEVER import this file from a client component — secrets are read server-side only.
 */
import { createHmac } from "crypto";

type CashfreeEnv = "sandbox" | "production";

export function getCashfreeMode(): CashfreeEnv {
  return process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
}

function getBaseUrl(mode: CashfreeEnv) {
  return mode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function getHeaders() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree credentials not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY."
    );
  }
  return {
    "x-client-id": appId,
    "x-client-secret": secretKey,
    "x-api-version": "2023-08-01",
    "Content-Type": "application/json",
  };
}

export interface CreateOrderParams {
  orderId: string;
  amountRupees: number;
  currency: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface CashfreeOrderResult {
  cfOrderId: string | number;
  paymentSessionId: string;
}

export async function createCashfreeOrder(
  params: CreateOrderParams
): Promise<CashfreeOrderResult> {
  const mode = getCashfreeMode();
  const headers = getHeaders();

  const res = await fetch(`${getBaseUrl(mode)}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      order_id: params.orderId,
      order_amount: params.amountRupees,
      order_currency: params.currency,
      customer_details: {
        customer_id: params.customerId,
        customer_name: params.customerName || "Student",
        customer_email:
          params.customerEmail || `cf_${params.customerId}@saphala.in`,
        customer_phone: params.customerPhone,
      },
      order_meta: {
        return_url: params.returnUrl,
        notify_url: params.notifyUrl,
      },
    }),
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Cashfree: ${data.message ?? data.type ?? res.status}`);
  }
  return {
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
  };
}

/**
 * Verify a Cashfree webhook signature.
 * Cashfree signs: HMAC-SHA256(timestamp + rawBody, CASHFREE_WEBHOOK_SECRET) → base64
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[webhook] CASHFREE_WEBHOOK_SECRET not set — cannot verify signature");
    return false;
  }
  const message = timestamp + rawBody;
  const expected = createHmac("sha256", secret).update(message).digest("base64");
  return expected === signature;
}

/** Sanitise a mobile string to a 10-digit Indian number for Cashfree. */
export function sanitizePhone(mobile: string | null | undefined): string {
  if (!mobile) return "9999999999";
  const digits = mobile.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 ? last10 : last10.padStart(10, "9");
}
