import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import ResultClient from "./ResultClient";

interface Props {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutResultPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/checkout/result");

  const { orderId } = await searchParams;
  if (!orderId) redirect("/plans");

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md">
          <ResultClient orderId={orderId} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
