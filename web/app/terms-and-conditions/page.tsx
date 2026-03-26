import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Saphala Pathshala",
  description:
    "Terms and conditions governing your use of the Saphala Pathshala platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-gray-400 mb-10">
            Last updated: March 2025 &nbsp;·&nbsp; Saphala Pathshala
          </p>

          <div className="space-y-8 text-sm text-gray-600 leading-relaxed">

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">1. Acceptance of Terms</h2>
              <p>
                By registering for or using the Saphala Pathshala platform (&quot;Platform&quot;),
                you (&quot;Student&quot; or &quot;User&quot;) agree to be bound by these Terms &amp;
                Conditions in full. If you do not agree, you must not access or use the Platform.
                These terms apply to all visitors, registered students, and purchasers.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">2. Platform Access and Eligibility</h2>
              <p>
                The Platform is intended for students preparing for competitive examinations in India.
                You must provide accurate registration details including your full name, a valid email
                address, and a 10-digit Indian mobile number. You are responsible for maintaining
                the confidentiality of your login credentials. You must not share your account with
                any other person.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">3. One-Device Login Policy</h2>
              <p>
                By default, your account is permitted on <span className="font-medium text-gray-700">one
                registered device</span> only. Logging in from a second device is blocked until your
                device binding is reset by an administrator. If you need to switch devices (e.g., due
                to a hardware failure), contact our support team. Attempts to circumvent this policy
                using VPNs, browser spoofing, or other means are a violation of these Terms and may
                result in immediate account suspension.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">4. Prohibited Conduct</h2>
              <p className="mb-2">You must not:</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Share your login credentials with any other person.</li>
                <li>Allow any other person to access, use, or benefit from your account.</li>
                <li>Download, copy, reproduce, redistribute, or publish any course content, test questions, videos, PDFs, flashcard decks, or ebooks from the Platform by any means.</li>
                <li>Use screen recording software, automated tools, or bots to capture or scrape Platform content.</li>
                <li>Reverse-engineer, decompile, or tamper with any part of the Platform.</li>
                <li>Post or transmit any content that is unlawful, abusive, or in violation of any applicable Indian law.</li>
                <li>Attempt to gain unauthorized access to other users&apos; accounts or Platform infrastructure.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">5. Content Misuse and Infringement Escalation</h2>
              <p>
                Saphala Pathshala takes content misuse seriously. Our infringement escalation policy
                operates as follows:
              </p>
              <ol className="mt-2 space-y-2 list-decimal list-inside">
                <li><span className="font-medium text-gray-700">First warning:</span> A formal written warning is issued to your registered email address. Access remains active.</li>
                <li><span className="font-medium text-gray-700">Second warning:</span> A second written warning is issued. Course access may be temporarily suspended for up to 7 days.</li>
                <li><span className="font-medium text-gray-700">Third violation:</span> Your account is permanently blocked. No refund will be issued. Legal action may be initiated under applicable Indian copyright and data protection law.</li>
              </ol>
              <p className="mt-3">
                We reserve the right to skip to account termination in cases of egregious or commercial-scale
                misuse without prior warning.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">6. Course Access and Content Ownership</h2>
              <p>
                Purchasing a course or package grants you a <span className="font-medium text-gray-700">
                personal, non-transferable, limited licence</span> to access the associated content for
                the validity period specified at the time of purchase. This licence does not confer
                ownership of any content. All course material — including videos, tests, PDFs,
                flashcard decks, and ebooks — remains the exclusive intellectual property of Saphala
                Pathshala or its licensor faculty.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">7. Course Validity and Access Expiry</h2>
              <p>
                Each course or package has a stated validity period (e.g., 6 months, 12 months, or a
                fixed end date). Access to all content within that course expires automatically at the
                end of the validity period. Saphala Pathshala does not guarantee extension of access
                after expiry. Validity extensions, if offered, are at the sole discretion of the
                platform and may attract an additional fee.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">8. No Guarantee of Results</h2>
              <p>
                Saphala Pathshala provides educational tools and study materials to assist your
                preparation. We make no guarantee, representation, or warranty that use of the
                Platform will result in passing any examination, obtaining any rank, or securing
                any employment or government appointment. Exam outcomes depend on individual effort,
                exam authority decisions, and factors beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">9. Account Suspension and Termination</h2>
              <p>
                We reserve the right to suspend or permanently block your account without prior notice
                if we determine — at our sole discretion — that you have violated these Terms, misused
                content, shared access, or engaged in fraudulent activity. In cases of suspension, no
                refund will be issued for the remaining validity period. You may appeal a suspension
                by contacting our support team, and we will review appeals within 10 business days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable Indian law, Saphala Pathshala shall not
                be liable for any indirect, incidental, special, or consequential damages arising from
                your use of the Platform, including but not limited to loss of data, loss of exam
                opportunity, or failure to achieve expected exam results. Our total liability to you
                for any direct loss shall not exceed the amount paid by you in the 12 months
                preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">11. Governing Law and Jurisdiction</h2>
              <p>
                These Terms are governed by the laws of India. Any disputes arising out of or in
                connection with these Terms shall be subject to the exclusive jurisdiction of the
                courts located in Vijayawada, Andhra Pradesh, India.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">12. Amendments</h2>
              <p>
                We may update these Terms at any time. Revised Terms will be posted on this page with
                an updated date. Continued use of the Platform after changes are posted constitutes
                your acceptance of the updated Terms. For significant changes, we will notify
                registered users via their registered email address.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">13. Contact</h2>
              <p>For questions about these Terms, contact us at:</p>
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
