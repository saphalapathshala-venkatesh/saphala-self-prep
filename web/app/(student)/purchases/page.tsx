import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/paymentOrderDb";

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));
}

function paise(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default async function MyPurchasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/purchases");

  const allOrders = await listOrdersForUser(user.id).catch(() => []);

  const purchases = allOrders.filter(
    (o) => o.status === "PAID" && o.finalAmountPaise > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">My Purchases</h1>
        <p className="text-sm text-gray-500 mt-1">
          All courses and packages you have purchased
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-[#6D4BCB]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-[#2D1B69] text-lg mb-2">
            No purchases yet
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Browse our course catalogue and unlock premium content to accelerate
            your exam preparation.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Purchased
                    </span>
                  </div>

                  <h3 className="font-bold text-[#2D1B69] text-base leading-snug">
                    {order.packageName ?? "Course Package"}
                  </h3>

                  {order.packageDescription && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {order.packageDescription}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span>Purchased on {formatDate(order.paidAt)}</span>
                    <span className="hidden sm:inline">
                      Order ID: {order.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-[#2D1B69]">
                    {paise(order.finalAmountPaise, order.currency)}
                  </p>
                  {order.discountPaise > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      saved {paise(order.discountPaise, order.currency)}
                    </p>
                  )}
                  {order.grossPaise !== order.finalAmountPaise && order.discountPaise === 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 line-through">
                      {paise(order.grossPaise, order.currency)}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <Link
                  href="/dashboard/courses"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6D4BCB] hover:text-[#5C3DB5] transition-colors"
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Access Content
                </Link>

                <Link
                  href={`/orders`}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  View order details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
