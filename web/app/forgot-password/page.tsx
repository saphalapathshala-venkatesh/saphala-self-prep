import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password | Saphala Pathshala",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col bg-purple-50/50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-purple-100 text-center">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">Reset Password</h1>
              <p className="text-gray-500 text-sm">
                Verify your identity to set a new password.
              </p>
            </div>
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
