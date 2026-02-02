import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-gray-50 py-20 flex-grow">
        <div className="container mx-auto px-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-4">Dashboard</h1>
            <p className="text-gray-600 mb-6">
              Welcome back! You are logged in as <strong>{user.email}</strong>.
            </p>
            <div className="bg-purple-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Mobile:</span> +91 {user.mobile}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
