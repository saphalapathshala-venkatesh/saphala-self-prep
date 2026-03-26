import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const metadata = {
  title: "Refund Policy — Saphala Pathshala",
  description:
    "Refund and cancellation policy for course purchases on Saphala Pathshala.",
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">
            Refund Policy
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            Last updated: March 2025 &nbsp;·&nbsp; Saphala Pathshala
          </p>

          <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">1. Scope</h2>
              <p>
                This Refund Policy applies to all purchases made on the Saphala Pathshala platform,
                including course packs, test series subscriptions, video-only plans, and all other
                paid learning products (&quot;Products&quot;). By completing a purchase, you confirm
                that you have read and understood this policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">2. Refund Eligibility Conditions</h2>
              <p className="mb-3">
                A refund request will be considered only if <span className="font-medium text-gray-700">both</span>{" "}
                of the following conditions are met:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                  <p className="font-medium text-gray-700 mb-1">Condition A — Time Limit</p>
                  <p>
                    The refund request must be submitted within <span className="font-medium text-gray-700">3 calendar days</span>{" "}
                    of the original purchase date. Requests received after 3 days will not be eligible,
                    regardless of the reason.
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                  <p className="font-medium text-gray-700 mb-1">Condition B — Content Consumption Limit</p>
                  <p>
                    Not more than <span className="font-medium text-gray-700">10% of the purchased course content</span>{" "}
                    must have been accessed or consumed at the time of the refund request. Content consumption
                    is measured by the platform and includes lessons read, videos watched, tests attempted,
                    and flashcard decks studied. If more than 10% of content has been consumed,
                    no refund will be issued.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">3. Non-Refundable Situations</h2>
              <p className="mb-2">No refund will be issued in any of the following situations:</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>The refund request is received more than 3 days after purchase.</li>
                <li>More than 10% of the purchased content has been accessed.</li>
                <li>The account has been suspended or blocked for a Terms &amp; Conditions violation, including content misuse or account sharing.</li>
                <li>The course validity period has expired.</li>
                <li>The request is made for a free or discounted promotional enrolment.</li>
                <li>The purchase was made using a coupon that explicitly states &quot;non-refundable&quot;.</li>
                <li>The request is based solely on a change of mind after content access has begun.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">4. Refund Amount</h2>
              <p>
                If a refund is approved, the refunded amount will be the <span className="font-medium text-gray-700">
                net amount received by Saphala Pathshala</span> after deduction of payment gateway charges.
                Payment gateway processing fees (typically 2–3% of the transaction value) are non-recoverable
                and will not be included in the refund. The exact deducted amount will be communicated to
                you at the time the refund is approved.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">5. Refund Processing Timeline</h2>
              <p>
                Approved refunds are initiated within <span className="font-medium text-gray-700">5–7 business days</span>{" "}
                of approval. The time for the amount to reflect in your account depends on your bank or payment
                instrument and may take an additional 3–7 business days. Saphala Pathshala is not responsible
                for delays caused by your bank or payment provider.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">6. Refund Mode</h2>
              <p>
                Refunds are credited to the original payment source — the same UPI ID, debit/credit card,
                net banking account, or wallet from which the payment was made. We do not issue refunds
                in cash, via bank transfer to a different account, or as platform credits (unless
                specifically agreed in writing).
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">7. How to Request a Refund</h2>
              <p>
                To submit a refund request, log in to your account and navigate to{" "}
                <span className="font-medium text-gray-700">My Orders</span>. Select the order for which
                you are requesting a refund, click &quot;Request Refund&quot;, and provide a reason. Alternatively,
                you may contact our support team directly using the details below. Please include your
                registered email address and order reference number in your communication.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">8. Review of Refund Requests</h2>
              <p>
                All refund requests are reviewed by our support team. We may contact you for additional
                information before a decision is made. We will communicate our decision within{" "}
                <span className="font-medium text-gray-700">3 business days</span> of receiving the
                complete request. Our decision is final.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">9. Technical Issues</h2>
              <p>
                If you experience a verified technical issue that prevents access to content you have
                paid for, and the issue is confirmed to be caused by our platform, we will either
                resolve the issue or provide a full refund at our discretion, regardless of the
                3-day window. Such claims must be reported to support with evidence (screenshots,
                error messages) within 7 days of the issue occurring.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">10. Contact</h2>
              <p>For refund-related enquiries, contact us at:</p>
              <address className="not-italic mt-2 space-y-0.5 text-gray-500">
                <p className="font-medium text-gray-700">Saphala Pathshala</p>
                <p>Vijayawada, Andhra Pradesh, India</p>
                <p>
                  Email:{" "}
                  <a href="mailto:support@saphala.in" className="text-[#6D4BCB] hover:underline">
                    support@saphala.in
                  </a>
                </p>
                <p>Phone: +91 98765 43210</p>
              </address>
            </section>

          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <Link
              href="/"
              className="text-sm font-semibold text-[#8050C0] hover:text-[#6D3DB0] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
