"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type OrderStatus = "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

interface OrderData {
  orderId: string;
  status: OrderStatus;
  packageName?: string;
  netPaise?: number;
  currency?: string;
  paidAt?: string | null;
}

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 3000;

function paise(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default function ResultClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/student/orders/${orderId}`);
      if (res.status === 404) {
        setError("Order not found.");
        return null;
      }
      if (!res.ok) return null;
      const data: OrderData = await res.json();
      setOrder(data);
      return data;
    } catch {
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    let count = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const data = await fetchStatus();
      count++;
      setPollCount(count);

      if (!data || data.status === "PAID" || data.status === "FAILED" || data.status === "CANCELLED") {
        // Terminal state — stop polling
        if (data?.status === "PAID") {
          // Brief delay then redirect to orders
          setTimeout(() => router.push("/orders"), 3000);
        }
        return;
      }

      if (count < MAX_POLLS) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, [fetchStatus, router]);

  // Loading / polling
  if (!order) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
          <span className="w-7 h-7 border-3 border-purple-200 border-t-[#6D4BCB] rounded-full animate-spin block" style={{ borderWidth: "3px" }} />
        </div>
        <h2 className="text-xl font-bold text-[#2D1B69]">Verifying Payment</h2>
        <p className="text-sm text-gray-500">Please wait while we confirm your payment…</p>
        {pollCount > 5 && (
          <p className="text-xs text-gray-400">This is taking a moment. Please stay on this page.</p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // PAID
  if (order.status === "PAID") {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-green-700">Payment Successful!</h2>
          {order.packageName && (
            <p className="text-sm text-gray-600 mt-1">
              You now have access to <strong>{order.packageName}</strong>
            </p>
          )}
          {order.netPaise !== undefined && order.netPaise > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Paid {paise(order.netPaise, order.currency)}
            </p>
          )}
          {order.netPaise === 0 && (
            <p className="text-xs text-gray-400 mt-1">Free access granted</p>
          )}
        </div>
        <p className="text-sm text-gray-500">Redirecting you to your orders…</p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/orders"
            className="w-full py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors text-center"
          >
            View My Orders
          </Link>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors text-center"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // FAILED / CANCELLED
  if (order.status === "FAILED" || order.status === "CANCELLED") {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-red-600">Payment {order.status === "CANCELLED" ? "Cancelled" : "Failed"}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {order.status === "CANCELLED"
              ? "Your payment was cancelled. No charges were made."
              : "Something went wrong with your payment. No charges were made."}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={`/checkout?packageId=${/* stored in order name, use orders page */ ""}` }
            onClick={(e) => { e.preventDefault(); window.history.back(); }}
            className="w-full py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors text-center"
          >
            Try Again
          </Link>
          <Link
            href="/plans"
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors text-center"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  // Still PENDING / CREATED after MAX_POLLS
  if (pollCount >= MAX_POLLS) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-amber-700">Payment Processing</h2>
        <p className="text-sm text-gray-500">
          Your payment is still being confirmed. This may take a few minutes.
          Check <Link href="/orders" className="text-[#6D4BCB] underline">My Orders</Link> for the latest status.
        </p>
        <Link
          href="/orders"
          className="block w-full py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors text-center"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  // Still polling
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
        <span className="w-7 h-7 rounded-full animate-spin block" style={{ borderWidth: "3px", border: "3px solid #e9d5ff", borderTopColor: "#6D4BCB" }} />
      </div>
      <h2 className="text-xl font-bold text-[#2D1B69]">Confirming Payment</h2>
      <p className="text-sm text-gray-500">Please wait — do not close this page.</p>
    </div>
  );
}
