import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActivePackage } from "@/lib/paymentOrderDb";
import { getCashfreeMode } from "@/lib/cashfreeClient";
import { prisma } from "@/lib/db";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import CheckoutClient from "./CheckoutClient";

interface Props {
  searchParams: Promise<{ packageId?: string; courseId?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/checkout");

  const { packageId, courseId } = await searchParams;
  if (!packageId) redirect("/plans");

  const pkg = await getActivePackage(packageId).catch(() => null);
  if (!pkg) redirect("/plans");

  // If a courseId is present, use the admin-set course selling price as the
  // display base. This keeps the checkout amount consistent with the course
  // card and course detail page (both show Course.sellingPrice).
  let basePricePaise = pkg.pricePaise;
  let priceLabel = "Package price";

  if (courseId) {
    const safeId = courseId.replace(/'/g, "''");
    type CoursePrice = { sellingPrice: number | null };
    const rows = await prisma
      .$queryRawUnsafe<CoursePrice[]>(
        `SELECT "sellingPrice" FROM "Course"
         WHERE id = '${safeId}' AND "isActive" = true LIMIT 1`
      )
      .catch(() => [] as CoursePrice[]);
    const sp = rows[0]?.sellingPrice;
    if (sp != null && sp > 0) {
      basePricePaise = Math.round(sp * 100);
      priceLabel = "Course price";
    }
  }

  // Read Cashfree mode server-side — never exposed via NEXT_PUBLIC_
  const cashfreeMode = getCashfreeMode();

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow py-10 px-4">
        <div className="max-w-lg mx-auto">
          <CheckoutClient
            packageId={pkg.id}
            packageName={pkg.name}
            packageDescription={pkg.description ?? ""}
            basePricePaise={basePricePaise}
            priceLabel={priceLabel}
            currency={pkg.currency}
            entitlementCodes={pkg.entitlementCodes}
            userName={user.fullName ?? ""}
            userEmail={user.email ?? ""}
            courseId={courseId ?? null}
            cashfreeMode={cashfreeMode}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
