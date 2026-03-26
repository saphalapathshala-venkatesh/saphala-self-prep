import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Saphala Pathshala",
  description:
    "How Saphala Pathshala collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-400 mb-8">
            Effective date: to be announced &nbsp;·&nbsp; Version 1.0
          </p>

          <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
            <p>
              This Privacy Policy explains how Saphala Pathshala (&quot;we&quot;,
              &quot;our&quot;, or &quot;us&quot;) collects, uses, and protects
              information that you provide when you use our platform, including
              our website, mobile applications, and all associated learning
              products.
            </p>

            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  1. Information We Collect
                </h2>
                <p>
                  We collect information you provide directly to us — such as
                  your name, email address, and mobile number when you register
                  — as well as usage data generated as you interact with our
                  courses, tests, and study materials.
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  2. How We Use Your Information
                </h2>
                <p>
                  We use your data to deliver and improve our learning services,
                  personalise your experience, communicate important updates,
                  and process payments securely. We do not sell your personal
                  data to third parties.
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  3. Data Security
                </h2>
                <p>
                  We implement industry-standard security measures — including
                  encrypted connections and hashed credentials — to protect your
                  information. Access to student data is restricted to authorised
                  personnel only.
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  4. Cookies
                </h2>
                <p>
                  We use session cookies to keep you logged in and to remember
                  your preferences. We do not use third-party tracking or
                  advertising cookies.
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  5. Your Rights
                </h2>
                <p>
                  You may request access to, correction of, or deletion of your
                  personal data at any time by contacting us at the email below.
                  We will respond within 30 days.
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[#2D1B69] mb-1">
                  6. Changes to This Policy
                </h2>
                <p>
                  We may update this Privacy Policy from time to time. We will
                  notify registered users of material changes via email or an
                  in-platform notice.
                </p>
              </div>
            </div>

            <div className="bg-[#F6F2FF] border border-[#8050C0]/20 rounded-xl p-5">
              <p className="text-[#6D4BCB] font-semibold text-sm mb-1">
                Document in progress
              </p>
              <p className="text-sm text-gray-600">
                The full Privacy Policy text is being finalised by our legal
                team and will be published before the platform launches
                publicly. Please check back soon.
              </p>
            </div>

            <p>
              For privacy-related enquiries, please contact us at{" "}
              <a
                href="mailto:support@saphala.in"
                className="text-[#6D4BCB] hover:underline font-medium"
              >
                support@saphala.in
              </a>
              .
            </p>
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
