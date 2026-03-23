import { getCashfreeConfig } from "./paymentOrderDb";

const CF_API_VERSION = "2023-08-01";

function cfBaseUrl(env: "sandbox" | "production"): string {
  return env === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";
}

export interface CfCreateOrderParams {
  orderId: string;
  finalAmountPaise: number;
  currency: string;
  userId: string;
  userEmail?: string | null;
  userMobile?: string | null;
  userName?: string | null;
  returnUrl: string;
  notifyUrl: string;
}

export interface CfOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

export async function createCashfreeOrder(
  params: CfCreateOrderParams
): Promise<CfOrderResponse> {
  const config = await getCashfreeConfig();
  if (!config) throw new Error("Payment gateway not configured");

  const amount = params.finalAmountPaise / 100;
  const body = {
    order_id: params.orderId,
    order_amount: amount,
    order_currency: params.currency,
    customer_details: {
      customer_id: params.userId,
      customer_email: params.userEmail || "student@saphala.in",
      customer_phone: params.userMobile || "9999999999",
      customer_name: params.userName || "Student",
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
  };

  const res = await fetch(`${cfBaseUrl(config.environment)}/pg/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "x-api-version": CF_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cashfree order creation failed: ${res.status} ${txt}`);
  }

  return res.json() as Promise<CfOrderResponse>;
}

export async function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  receivedSignature: string
): Promise<boolean> {
  const config = await getCashfreeConfig();
  if (!config?.webhookSecret) return true; // Skip if not configured

  const { createHmac } = await import("crypto");
  const data = `${timestamp}${rawBody}`;
  const expected = createHmac("sha256", config.webhookSecret)
    .update(data)
    .digest("base64");

  return expected === receivedSignature;
}
