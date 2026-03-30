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

  type CourseRow = {
    sellingPrice: number | null;
    validityType: string | null;
    validityDays: number | null;
    validityMonths: number | null;
  };

  // Run package lookup and course price/validity lookup in parallel.
  const [pkg, courseRows] = await Promise.all([
    getActivePackage(packageId).catch(() => null),
    courseId
      ? prisma
          .$queryRawUnsafe<CourseRow[]>(
            `SELECT "sellingPrice", "validityType", "validityDays", "validityMonths"
             FROM "Course"
             WHERE id = $1 AND "isActive" = true LIMIT 1`,
            courseId,
          )
          .catch(() => [] as CourseRow[])
      : Promise.resolve([] as CourseRow[]),
  ]);

  if (!pkg) redirect("/plans");

  // Determine base price: course selling price takes priority when present.
  let basePricePaise = pkg.pricePaise;
  let priceLabel = "Package price";

  const courseRow = courseRows[0] ?? null;
  const sp = courseRow?.sellingPrice;
  if (sp != null && sp > 0) {
    basePricePaise = Math.round(Number(sp) * 100);
    priceLabel = "Course price";
  }

  // Format validity label for display in checkout.
  function fmtValidity(
    type: string | null,
    days: number | null,
    months: number | null,
  ): string | null {
    if (!type) return null;
    if (type === "lifetime") return "Lifetime access";
    if (type === "days" && days) {
      const d = Number(days);
      if (d % 365 === 0) { const y = d / 365; return `${y} Year${y > 1 ? "s" : ""} access`; }
      if (d % 30 === 0)  { const m = d / 30;  return `${m} Month${m > 1 ? "s" : ""} access`; }
      return `${d} Days access`;
    }
    if (type === "months" && months) {
      const m = Number(months);
      return `${m} Month${m > 1 ? "s" : ""} access`;
    }
    return null;
  }

  const validityLabel = courseRow
    ? fmtValidity(courseRow.validityType, courseRow.validityDays, courseRow.validityMonths)
    : null;

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
            validityLabel={validityLabel}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
