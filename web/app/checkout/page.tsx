import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActivePackage } from "@/lib/paymentOrderDb";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import CheckoutClient from "./CheckoutClient";

interface Props {
  searchParams: Promise<{ packageId?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/checkout");

  const { packageId } = await searchParams;
  if (!packageId) redirect("/plans");

  const pkg = await getActivePackage(packageId).catch(() => null);
  if (!pkg) redirect("/plans");

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow py-10 px-4">
        <div className="max-w-lg mx-auto">
          <CheckoutClient
            packageId={pkg.id}
            packageName={pkg.name}
            packageDescription={pkg.description ?? ""}
            pricePaise={pkg.pricePaise}
            currency={pkg.currency}
            entitlementCodes={pkg.entitlementCodes}
            userName={user.fullName ?? ""}
            userEmail={user.email ?? ""}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
