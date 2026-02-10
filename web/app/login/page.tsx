import { Suspense } from "react";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col bg-purple-50/50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-purple-100 w-full max-w-md text-center">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">Welcome Back</h1>
            <p className="text-gray-500">Log in to your Saphala account</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  );
}
