"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import RefundModal from "@/components/orders/RefundModal";

type OrderStatus = "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

interface OrderRow {
  id: string;
  status: OrderStatus;
  packageName?: string;
  packageCode?: string;
  packageDescription?: string;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  openRefundRequest?: { id: string; status: string } | null;
}

interface RefundRequestRow {
  id: string;
  paymentOrderId: string;
  packageName: string | null;
  packageCode: string | null;
  paidPaise: number;
  requestedPaise: number | null;
  reasonCategory: string;
  reasonText: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

function paise(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    PAID: { label: "Paid", cls: "bg-green-100 text-green-700" },
    PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
    CREATED: { label: "Processing", cls: "bg-blue-100 text-blue-700" },
    FAILED: { label: "Failed", cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

const REFUND_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Refund requested",
  UNDER_REVIEW: "Under review",
  APPROVED: "Refund approved",
  REJECTED: "Refund rejected",
  PROCESSED: "Refund processed",
  FAILED: "Refund failed",
  CANCELLED: "Refund cancelled",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"orders" | "refunds">("orders");

  const [refundModal, setRefundModal] = useState<{
    orderId: string;
    packageName: string;
    paidPaise: number;
  } | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, refundsRes] = await Promise.all([
        fetch("/api/student/orders"),
        fetch("/api/student/refund-requests"),
      ]);

      if (!ordersRes.ok) throw new Error("Could not load orders");
      const ordersData = await ordersRes.json();

      if (refundsRes.ok) {
        const refundsData = await refundsRes.json();
        setRefunds(refundsData.requests ?? []);
      }

      // Enrich orders with their open refund state
      const enriched: OrderRow[] = ordersData.orders ?? [];
      setOrders(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function handleRefundSuccess() {
    setRefundModal(null);
    setRefundSuccess("Your refund request has been submitted. We'll review it within 3-5 business days.");
    fetchAll();
  }

  const openRefundIds = new Set(
    refunds
      .filter((r) => ["REQUESTED", "UNDER_REVIEW"].includes(r.status))
      .map((r) => r.paymentOrderId)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Your purchase history and refund requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["orders", "refunds"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-white text-[#2D1B69] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "orders" ? "Orders" : "Refund Requests"}
            {tab === "refunds" && refunds.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-purple-100 text-purple-700 rounded-full px-1.5 py-0.5 font-bold">
                {refunds.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Success banner */}
      {refundSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold">Request Submitted</p>
            <p className="text-green-600 text-xs mt-0.5">{refundSuccess}</p>
          </div>
          <button onClick={() => setRefundSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Orders Tab */}
      {!loading && activeTab === "orders" && (
        <>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#2D1B69] mb-2">No orders yet</h3>
              <p className="text-sm text-gray-500 mb-5">
                Browse our plans to get started with premium content.
              </p>
              <Link
                href="/plans"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors"
              >
                Browse Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const hasOpenRefund = openRefundIds.has(order.id);
                const canRefund = order.status === "PAID" && !hasOpenRefund;

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <StatusBadge status={order.status} />
                          {hasOpenRefund && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              Refund requested
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-[#2D1B69] leading-tight">
                          {order.packageName ?? "Package"}
                        </h3>
                        {order.packageDescription && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {order.packageDescription}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#2D1B69]">
                          {order.netPaise === 0 ? "FREE" : paise(order.netPaise, order.currency)}
                        </p>
                        {order.discountPaise > 0 && (
                          <p className="text-xs text-green-600">
                            saved {paise(order.discountPaise, order.currency)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Order: {formatDate(order.createdAt)}</span>
                      {order.paidAt && <span>Paid: {formatDate(order.paidAt)}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      {order.status === "PAID" && (
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#6D4BCB] hover:text-[#5C3DB5] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Access Content
                        </Link>
                      )}
                      {(order.status === "PENDING" || order.status === "CREATED") && (
                        <Link
                          href={`/checkout/result?orderId=${order.id}`}
                          className="text-sm font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                        >
                          Check Payment Status
                        </Link>
                      )}
                      {(order.status === "FAILED" || order.status === "CANCELLED") && (
                        <Link
                          href="/plans"
                          className="text-sm font-semibold text-[#6D4BCB] hover:text-[#5C3DB5] transition-colors"
                        >
                          Try Again
                        </Link>
                      )}
                      {canRefund && (
                        <button
                          onClick={() => setRefundModal({
                            orderId: order.id,
                            packageName: order.packageName ?? "Package",
                            paidPaise: order.netPaise,
                          })}
                          className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
                        >
                          Request Refund
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Refunds Tab */}
      {!loading && activeTab === "refunds" && (
        <>
          {refunds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-700 mb-2">No refund requests</h3>
              <p className="text-sm text-gray-500">
                You have not submitted any refund requests yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {refunds.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#2D1B69]">{r.packageName ?? "Package"}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Requested on {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      ["APPROVED","PROCESSED"].includes(r.status)
                        ? "bg-green-100 text-green-700"
                        : ["REJECTED","FAILED","CANCELLED"].includes(r.status)
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {REFUND_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Amount paid</p>
                      <p className="font-semibold text-[#2D1B69]">{paise(r.paidPaise)}</p>
                    </div>
                    {r.requestedPaise && (
                      <div>
                        <p className="text-xs text-gray-400">Requested refund</p>
                        <p className="font-semibold text-green-600">{paise(r.requestedPaise)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Reason</p>
                    <p className="text-sm text-gray-600">{r.reasonText}</p>
                  </div>

                  {r.adminNote && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-400 mb-0.5">Admin Note</p>
                      <p className="text-sm text-gray-700">{r.adminNote}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <RefundModal
          orderId={refundModal.orderId}
          packageName={refundModal.packageName}
          paidPaise={refundModal.paidPaise}
          onClose={() => setRefundModal(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
}
