import ResetPasswordForm from "./ResetPasswordForm";
import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-white/80 hover:text-white text-sm transition-colors">
            ← Back to Saphala Pathshala
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          <ResetPasswordForm token={token ?? ""} />
        </div>
      </div>
    </main>
  );
}
