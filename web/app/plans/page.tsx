import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { listActivePackages } from "@/lib/paymentOrderDb";
import Link from "next/link";

function paise(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export default async function PlansPage() {
  const packages = await listActivePackages().catch(() => []);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-grow py-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-[#6D4BCB] text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Powered by Saphala
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">
              Choose Your Plan
            </h1>
            <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
              Unlock full access to premium study material, live classes, video lessons,
              and expert-curated test series for your exam preparation.
            </p>
          </div>

          {packages.length === 0 ? (
            /* Coming soon state */
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white rounded-2xl border border-[#E0D5FF] p-10 shadow-sm">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#6D4BCB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#2D1B69] mb-2">Plans Coming Soon</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  We are preparing premium plans to unlock the full Saphala experience.
                  Stay tuned for detailed pricing and access options.
                </p>
                <Link href="/testhub" className="btn-glossy-secondary">
                  Back to TestHub
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isFree = pkg.pricePaise === 0;
                return (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-2xl border border-[#E0D5FF] p-6 shadow-sm hover:shadow-md hover:border-[#6D4BCB]/30 transition-all flex flex-col"
                  >
                    {/* Badge */}
                    <div className="mb-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        isFree
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-[#6D4BCB]"
                      }`}>
                        {isFree ? "FREE" : "PREMIUM"}
                      </span>
                    </div>

                    {/* Name + description */}
                    <h2 className="text-lg font-bold text-[#2D1B69] leading-tight mb-2">
                      {pkg.name}
                    </h2>
                    {pkg.description && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">
                        {pkg.description}
                      </p>
                    )}

                    {/* Entitlements */}
                    {pkg.entitlementCodes.length > 0 && (
                      <div className="mb-5 space-y-2">
                        {pkg.entitlementCodes.map((code) => (
                          <div key={code} className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-[#6D4BCB] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {code.replace(/_/g, " ")}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Price + CTA */}
                    <div className="mt-auto space-y-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#2D1B69]">
                          {isFree ? "Free" : paise(pkg.pricePaise, pkg.currency)}
                        </span>
                        {!isFree && (
                          <span className="text-sm text-gray-400">one-time</span>
                        )}
                      </div>
                      <Link
                        href={`/checkout?packageId=${pkg.id}`}
                        className="block w-full text-center py-3 rounded-xl bg-[#6D4BCB] hover:bg-[#5C3DB5] text-white font-semibold text-sm transition-colors"
                      >
                        {isFree ? "Get Free Access" : "Buy Now"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-10">
            All prices are inclusive of taxes. Secure payments powered by Cashfree.
            <Link href="/refund-policy" className="ml-1 underline hover:text-gray-600">Refund Policy</Link>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
