import { getPublishedTestsForStudent } from "@/lib/testhubDb";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import TestHubClient from "@/components/testhub/TestHubClient";

export const dynamic = "force-dynamic";

export default async function TestHubPage() {
  const user = await getCurrentUser();
  const tests = await getPublishedTestsForStudent(user?.id);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <section className="bg-white py-12 border-b border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">TestHub</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Simulated tests that feel like the real exam. Choose a category, pick a test, and start practicing.
          </p>
        </div>
      </section>

      <TestHubClient initialTests={tests} />

      <Footer />
    </main>
  );
}
