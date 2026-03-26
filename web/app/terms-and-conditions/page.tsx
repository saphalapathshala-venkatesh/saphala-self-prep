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
                preparation. <span className="font-medium text-gray-700">We make absolutely no guarantee,
                representation, or warranty</span> — express or implied — that use of the Platform will
                result in passing any examination, achieving any rank or percentile, securing any
                government job, selection, or appointment, or any other specific outcome. Exam results
                depend entirely on individual effort, the policies of the examination authority, and
                numerous factors beyond our control. No statement made by any faculty member,
                marketing material, or result shared by another student constitutes a guarantee of
                your personal result.
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
                To the maximum extent permitted by applicable Indian law, Saphala Pathshala, its
                directors, employees, and faculty partners shall not be liable for any indirect,
                incidental, special, punitive, or consequential damages of any kind arising from or
                in connection with your use of or inability to use the Platform. This includes, without
                limitation: loss of data, loss of study progress, loss of preparation time, loss of
                exam opportunity, failure to achieve expected exam results, loss of employment or
                selection opportunity, or damage to your device. Our total cumulative liability to you
                for any direct loss, regardless of the cause of action, shall not exceed the total
                amount paid by you to Saphala Pathshala in the 12 months immediately preceding the
                claim.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">11. Service Availability</h2>
              <p>
                Saphala Pathshala does not guarantee that the Platform will be available at all times
                or operate without interruption, error, or delay. The Platform — including video
                lessons, live classes, test sessions, ebook access, and all other features — may
                experience scheduled maintenance, unplanned downtime, or degraded performance. We
                will make reasonable efforts to minimise disruption and communicate planned maintenance
                in advance. Saphala Pathshala is not liable for any loss or damage resulting from
                Platform unavailability, whether during an active exam session, a scheduled live class,
                or routine content access.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">12. Force Majeure</h2>
              <p>
                Saphala Pathshala shall not be held liable for any failure or delay in performing
                its obligations under these Terms where such failure or delay results from causes
                beyond our reasonable control. This includes, without limitation: server or data
                centre outages, internet infrastructure failures, failures of third-party services
                (including payment gateways, video hosts, or cloud providers), acts of government or
                regulatory authority, natural disasters, pandemics, civil unrest, power failures,
                or any other event of force majeure. In such circumstances, our obligations are
                suspended for the duration of the event, and we will resume normal service as
                soon as reasonably practicable.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">13. Governing Law and Jurisdiction</h2>
              <p>
                These Terms are governed by the laws of India. Any disputes arising out of or in
                connection with these Terms shall be subject to the exclusive jurisdiction of the
                courts located in Nellore, Andhra Pradesh, India.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">14. Amendments</h2>
              <p>
                We reserve the right to modify these Terms at any time. Updated Terms will be posted
                on this page with a revised date and become effective immediately upon posting, unless
                a later effective date is specified. Your continued use of the Platform after updated
                Terms are posted constitutes your acceptance of the changes. If you do not agree to
                the updated Terms, you must discontinue use of the Platform. For material changes,
                we will endeavour to notify registered users via their registered email address, but
                such notification is not a condition of the change taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-[#2D1B69] mb-2">15. Contact</h2>
              <p>For questions about these Terms, contact us at:</p>
              <address className="not-italic mt-2 space-y-0.5 text-gray-500">
                <p className="font-medium text-gray-700">Saphala Pathshala</p>
                <p>MIG 279, Phase 1, APHB Colony, Kallurpalli, Nellore - 524003</p>
                <p>
                  Email:{" "}
                  <a href="mailto:support@saphala.in" className="text-[#6D4BCB] hover:underline">
                    support@saphala.in
                  </a>
                </p>
                <p>
                  Phone:{" "}
                  <a href="tel:+919866036606" className="hover:text-[#6D4BCB] transition-colors">
                    +91 98660 36606
                  </a>
                </p>
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
