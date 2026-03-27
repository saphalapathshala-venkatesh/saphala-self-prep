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

  type CoursePrice = { sellingPrice: number | null };

  // Run package lookup and course price lookup in parallel.
  const [pkg, coursePriceRows] = await Promise.all([
    getActivePackage(packageId).catch(() => null),
    courseId
      ? prisma
          .$queryRawUnsafe<CoursePrice[]>(
            `SELECT "sellingPrice" FROM "Course"
             WHERE id = $1 AND "isActive" = true LIMIT 1`,
            courseId,
          )
          .catch(() => [] as CoursePrice[])
      : Promise.resolve([] as CoursePrice[]),
  ]);

  if (!pkg) redirect("/plans");

  // Determine base price: course selling price takes priority when present.
  let basePricePaise = pkg.pricePaise;
  let priceLabel = "Package price";

  const sp = coursePriceRows[0]?.sellingPrice;
  if (sp != null && sp > 0) {
    basePricePaise = Math.round(sp * 100);
    priceLabel = "Course price";
  }

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
