import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Saphala Pathshala",
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
          <p className="text-sm text-gray-400 mb-8">
            Effective date: to be announced &nbsp;·&nbsp; Version 1.0
          </p>

          <div className="prose prose-sm max-w-none text-gray-600 space-y-6">
            <p>
              These Terms &amp; Conditions govern your use of the Saphala
              Pathshala platform, including all learning products, test series,
              and study materials made available to registered students.
            </p>

            <div className="bg-[#F6F2FF] border border-[#8050C0]/20 rounded-xl p-5">
              <p className="text-[#6D4BCB] font-semibold text-sm mb-1">
                Document in progress
              </p>
              <p className="text-sm text-gray-600">
                The full Terms &amp; Conditions text is being finalised and will
                be published here before the platform launches publicly. Please
                check back soon.
              </p>
            </div>

            <p>
              If you have questions in the meantime, please contact us at{" "}
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
