import { Suspense } from "react";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col bg-purple-50/50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-purple-100 w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">Create Account</h1>
            <p className="text-gray-500">Join Saphala Pathshala today</p>
          </div>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  );
}
