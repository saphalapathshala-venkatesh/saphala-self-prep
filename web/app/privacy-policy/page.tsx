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
          <p className="text-sm text-gray-400 mb-10">
            Last updated: March 2025 &nbsp;·&nbsp; Saphala Pathshala
          </p>

          <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">1. Who We Are</h2>
              <p>
                Saphala Pathshala (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is an online
                educational platform operated from Vijayawada, Andhra Pradesh, India. We provide
                structured self-paced learning, simulated exam practice, video lessons, and digital
                study materials for competitive exam aspirants. By registering or using our platform,
                you agree to this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">2. Information We Collect</h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><span className="font-medium text-gray-700">Registration data:</span> Full name, email address, and 10-digit mobile number (India).</li>
                <li><span className="font-medium text-gray-700">Device data:</span> Device fingerprint, browser type, and IP address — collected to enforce our one-device login policy and detect unauthorized access.</li>
                <li><span className="font-medium text-gray-700">Usage data:</span> Pages visited, lessons read, flashcards studied, tests attempted, videos watched, time spent, and answers submitted — used to power your progress tracking and XP system.</li>
                <li><span className="font-medium text-gray-700">Payment data:</span> Order amounts and payment status are stored. Card or UPI details are processed exclusively by our payment gateway partner (Cashfree) and are never stored on our servers.</li>
                <li><span className="font-medium text-gray-700">Communications:</span> Messages submitted via the contact form or to our support email.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">3. How We Use Your Information</h2>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>To create and manage your student account and session.</li>
                <li>To deliver course content, track your learning progress, and award XP points.</li>
                <li>To enforce our one-device login policy and detect simultaneous or unauthorized access.</li>
                <li>To process course purchases, manage entitlements, and handle refund requests.</li>
                <li>To send transactional communications (account confirmation, password reset, order receipts).</li>
                <li>To detect and prevent policy violations, content misuse, and fraudulent activity.</li>
                <li>To improve platform performance, fix bugs, and develop new features.</li>
              </ul>
              <p className="mt-3">
                We do not sell, rent, or share your personal data with third parties for marketing
                purposes. We do not use your data for targeted advertising.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">4. Device Binding and Session Management</h2>
              <p>
                Our platform enforces a <span className="font-medium text-gray-700">one-device policy</span> by
                default. When you log in for the first time, your device is registered to your account.
                Subsequent login attempts from a different device are blocked unless an administrator
                resets your device binding. This data is stored solely for security and fair-use enforcement
                and is deleted when your account is closed or a device reset is performed.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">5. Cookies and Sessions</h2>
              <p>
                We use HTTP-only session cookies to keep you securely logged in. These cookies contain
                a session token only — no personal data is stored in the cookie itself. We do not use
                advertising cookies, third-party tracking pixels, or cross-site analytics. Sessions
                are automatically invalidated on logout, on password reset, or when revoked by an
                administrator.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">6. Data Retention</h2>
              <p>
                Your account data is retained for the duration of your account and for a reasonable
                period thereafter as required by applicable Indian law. Attempt records, XP history,
                and order records are retained to support dispute resolution. You may request deletion
                of your account by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">7. Data Security</h2>
              <p>
                All data is transmitted over HTTPS/TLS. Passwords are stored using industry-standard
                one-way hashing (bcrypt). Access to the database is restricted to authorised
                personnel and automated systems only. We conduct regular security reviews to identify
                and address vulnerabilities.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">8. Your Rights</h2>
              <p>
                You have the right to access, correct, or request deletion of your personal data. To
                exercise these rights, contact us at{" "}
                <a href="mailto:support@saphala.in" className="text-[#6D4BCB] hover:underline font-medium">
                  support@saphala.in
                </a>
                . We will acknowledge your request within 7 business days and respond fully within 30
                days. Note that certain data (e.g., order records) may be retained as required by law
                even after account deletion.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">9. Service Availability</h2>
              <p>
                While we strive to keep the Platform available and your data protected at all times,
                Saphala Pathshala cannot guarantee uninterrupted service. The Platform may experience
                downtime, maintenance windows, or technical failures that could temporarily affect
                your ability to access content. We will make reasonable efforts to restore service
                promptly and will not process or expose your data beyond what is necessary during
                recovery operations.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">10. Force Majeure</h2>
              <p>
                Saphala Pathshala shall not be liable for any failure to fulfil its obligations under
                this Privacy Policy where such failure results from events beyond our reasonable
                control, including server or infrastructure outages, internet failures, third-party
                service disruptions, natural disasters, or acts of government. We will take reasonable
                steps to protect your data and restore normal operations as soon as practicable.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">11. Changes to This Policy</h2>
              <p>
                We reserve the right to modify this Privacy Policy at any time. Updated versions will
                be posted on this page with a revised date and become effective immediately upon
                posting, unless a later date is specified. Your continued use of the Platform after
                an updated Privacy Policy is posted constitutes your acceptance of the changes. If
                you do not agree to the updated policy, you should discontinue use of the Platform
                and may request deletion of your account by contacting our support team. For material
                changes, we will endeavour to notify registered users via their registered email
                address, but such notification is not a condition of the change taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">12. Contact</h2>
              <p>
                For privacy-related queries or data requests, contact us at:
              </p>
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
