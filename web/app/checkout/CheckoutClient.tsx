"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LEGAL_TERMS_URL, LEGAL_REFUND_URL } from "@/config/legal";

interface Props {
  packageId: string;
  packageName: string;
  packageDescription: string;
  /** Base price in paise. Set from Course.sellingPrice when entering from a course page. */
  basePricePaise: number;
  /** Label for the base price row, e.g. "Course price" or "Package price". */
  priceLabel: string;
  currency: string;
  entitlementCodes: string[];
  userName: string;
  userEmail: string;
  /** Present when checkout was reached from a course detail page. Sent to the
   *  orders API so the server uses Course.sellingPrice as the authoritative amount. */
  courseId: string | null;
  /** Cashfree mode derived server-side — never exposed via NEXT_PUBLIC_. */
  cashfreeMode: "sandbox" | "production";
  /** Human-readable validity string, e.g. "1 Year access" or "Lifetime access". Null when not set on the course. */
  validityLabel?: string | null;
}

type CouponState = "idle" | "checking" | "applied" | "error";

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (opts: {
        paymentSessionId: string;
        redirectTarget?: string;
      }) => Promise<void>;
    };
  }
}

function paise(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default function CheckoutClient({
  packageId,
  packageName,
  packageDescription,
  basePricePaise,
  priceLabel,
  currency,
  entitlementCodes,
  userName,
  userEmail,
  courseId,
  cashfreeMode,
  validityLabel,
}: Props) {
  const router = useRouter();
  const [couponInput, setCouponInput] = useState("");
  const [couponState, setCouponState] = useState<CouponState>("idle");
  const [couponError, setCouponError] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const submitLock = useRef(false);

  const netPaise = Math.max(0, basePricePaise - couponDiscount);
  const isFree = netPaise === 0;

  // Load Cashfree SDK (only the JS SDK — no secrets)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Cashfree) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => setSdkReady(true);
    script.onerror = () =>
      console.warn("Cashfree SDK failed to load");
    document.body.appendChild(script);
  }, []);

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponState("idle");
    setCouponError("");
    setCouponInput("");
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponState("checking");
    setCouponError("");
    try {
      const res = await fetch(
        `/api/student/coupon?code=${encodeURIComponent(code)}&packageId=${encodeURIComponent(packageId)}&basePricePaise=${basePricePaise}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) {
        setCouponState("error");
        setCouponError(data.error ?? "Invalid or expired coupon code");
        return;
      }
      if (data.discountPaise > 0) {
        setCouponDiscount(data.discountPaise);
        setAppliedCoupon(data.couponCode ?? code.toUpperCase());
        setCouponState("applied");
      } else {
        setCouponState("error");
        setCouponError("Coupon does not apply to this package");
      }
    } catch {
      setCouponState("error");
      setCouponError("Could not validate coupon. Please try again.");
    }
  }

  async function handleCheckout() {
    if (submitLock.current || isSubmitting) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/student/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          ...(couponState === "applied" && appliedCoupon
            ? { couponCode: appliedCoupon }
            : {}),
          ...(courseId ? { courseId } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create order. Please try again.");
        return;
      }

      // Free / zero-amount fast path
      if (data.status === "PAID" || isFree) {
        router.push(`/checkout/result?orderId=${data.orderId}`);
        return;
      }

      const { paymentSessionId, orderId } = data;
      if (!paymentSessionId) {
        setError("Payment session could not be created. Please try again.");
        return;
      }

      // Initiate Cashfree checkout — mode comes from server, never NEXT_PUBLIC_
      if (!window.Cashfree || !sdkReady) {
        setError(
          "Payment gateway is still loading. Please wait a moment and try again."
        );
        return;
      }
      const cashfree = window.Cashfree({ mode: cashfreeMode });
      router.prefetch(`/checkout/result?orderId=${orderId}`);
      await cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
    } catch (err) {
      console.error("[checkout]", err);
      setError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/plans"
          className="text-sm text-[#6D4BCB] hover:underline flex items-center gap-1 mb-4"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Plans
        </Link>
        <h1 className="text-2xl font-bold text-[#2D1B69]">
          Complete Your Purchase
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Secure checkout powered by Cashfree
        </p>
      </div>

      {/* Package card */}
      <div className="bg-white rounded-2xl border border-[#E0D5FF] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-[#6D4BCB]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-[#2D1B69] text-lg leading-tight">
              {packageName}
            </h2>
            {packageDescription && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {packageDescription}
              </p>
            )}
            {entitlementCodes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entitlementCodes.map((code) => (
                  <span
                    key={code}
                    className="text-[10px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200"
                  >
                    {code.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}

            {/* Validity badge */}
            {validityLabel && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 w-fit">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-amber-700">{validityLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buyer info */}
      {(userName || userEmail) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-600 space-y-1">
          <p className="font-medium text-gray-800">{userName}</p>
          {userEmail && <p className="text-gray-500">{userEmail}</p>}
        </div>
      )}

      {/* Coupon */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-[#2D1B69] mb-3">
          Coupon Code
        </p>
        {couponState === "applied" ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>{appliedCoupon}</span>
              <span className="font-normal text-green-600">
                — saving {paise(couponDiscount, currency)}
              </span>
            </div>
            <button
              onClick={removeCoupon}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
              placeholder="Enter coupon code"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D4BCB]/30 focus:border-[#6D4BCB] uppercase tracking-wider"
              disabled={couponState === "checking"}
            />
            <button
              onClick={applyCoupon}
              disabled={!couponInput.trim() || couponState === "checking"}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-purple-100 text-[#6D4BCB] hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {couponState === "checking" ? "..." : "Apply"}
            </button>
          </div>
        )}
        {couponState === "error" && (
          <p className="text-xs text-red-500 mt-2">{couponError}</p>
        )}
      </div>

      {/* Price summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{priceLabel}</span>
          <span>{paise(basePricePaise, currency)}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Coupon discount</span>
            <span>− {paise(couponDiscount, currency)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-[#2D1B69]">
          <span>Total</span>
          <span className="text-lg">{isFree ? "FREE" : paise(netPaise, currency)}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleCheckout}
        disabled={isSubmitting || (!sdkReady && !isFree)}
        className="w-full py-4 rounded-2xl bg-[#6D4BCB] hover:bg-[#5C3DB5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base transition-colors shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : isFree ? (
          "Get Free Access"
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Pay {paise(netPaise, currency)} Securely
          </>
        )}
      </button>

      {/* Legal */}
      <p className="text-xs text-center text-gray-400 leading-relaxed">
        By completing this purchase you agree to our{" "}
        <Link href={LEGAL_TERMS_URL} className="underline hover:text-gray-600">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href={LEGAL_REFUND_URL} className="underline hover:text-gray-600">
          Refund Policy
        </Link>
        .
      </p>
    </div>
  );
}
