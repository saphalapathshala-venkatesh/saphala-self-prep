/**
 * Server-only Cashfree PG integration.
 * NEVER import this file from a client component — secrets are read server-side only.
 */
import { createHmac } from "crypto";

type CashfreeEnv = "sandbox" | "production";

export function getCashfreeMode(): CashfreeEnv {
  const mode = process.env.CASHFREE_ENV === "production" ? "production" : "sandbox";
  return mode;
}

export function getCashfreeBaseUrl(): string {
  const mode = getCashfreeMode();
  const url =
    mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";
  return url;
}

/** Log the active mode once per cold start. */
let _modeLogged = false;
export function logCashfreeMode() {
  if (_modeLogged) return;
  _modeLogged = true;
  const mode = getCashfreeMode();
  console.log(
    `[CASHFREE_MODE] ${mode.toUpperCase()} | baseUrl=${getCashfreeBaseUrl()}`
  );
  if (mode === "sandbox") {
    console.warn(
      "[CASHFREE_MODE] WARNING — running in SANDBOX mode. Set CASHFREE_ENV=production for live payments."
    );
  }
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
  logCashfreeMode();

  const baseUrl = getCashfreeBaseUrl();
  const headers = getHeaders();

  console.log(
    `[ORDER_CREATE] start | orderId=${params.orderId} amount=₹${params.amountRupees} currency=${params.currency} mode=${getCashfreeMode()}`
  );
  console.log(
    `[ORDER_CREATE] return_url=${params.returnUrl} notify_url=${params.notifyUrl}`
  );

  const requestBody = {
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
  };

  const res = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(
      `[ORDER_CREATE] FAILED | status=${res.status} message=${data.message ?? data.type ?? "unknown"}`
    );
    throw new Error(`Cashfree: ${data.message ?? data.type ?? res.status}`);
  }

  console.log(
    `[ORDER_CREATE] SUCCESS | cfOrderId=${data.cf_order_id} sessionId=${String(data.payment_session_id).slice(0, 20)}...`
  );

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
    console.error(
      "[WEBHOOK_INVALID] CASHFREE_WEBHOOK_SECRET is not set — cannot verify webhook signature. Configure this env var immediately."
    );
    return false;
  }
  if (!timestamp || !signature) {
    console.warn("[WEBHOOK_INVALID] Missing x-webhook-timestamp or x-webhook-signature header");
    return false;
  }
  const message = timestamp + rawBody;
  const expected = createHmac("sha256", secret).update(message).digest("base64");
  const valid = expected === signature;
  if (!valid) {
    console.warn(
      `[WEBHOOK_INVALID] Signature mismatch | ts=${timestamp} expected=${expected.slice(0, 10)}... received=${signature.slice(0, 10)}...`
    );
  }
  return valid;
}

/** Sanitise a mobile string to a 10-digit Indian number for Cashfree. */
export function sanitizePhone(mobile: string | null | undefined): string {
  if (!mobile) return "9999999999";
  const digits = mobile.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length === 10 ? last10 : last10.padStart(10, "9");
}
