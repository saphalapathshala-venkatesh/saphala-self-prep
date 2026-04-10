import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPdfById, canUserAccessPdf } from "@/lib/contentDb";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PdfDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, pdf] = await Promise.all([getCurrentUser(), getPdfById(id)]);

  if (!user) redirect(`/login?from=/learn/pdfs/${id}`);
  if (!pdf) notFound();

  const canAccess = await canUserAccessPdf(user.id, pdf);

  if (canAccess) {
    redirect(pdf.fileUrl);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-[#2D1B69] mb-2">{pdf.title}</h1>
        <p className="text-sm text-gray-500 mb-6">
          This PDF is part of a paid course. Purchase the course to get full access to this study material.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6D4BCB] text-white text-sm font-semibold rounded-xl hover:bg-[#5C3DB5] transition-colors"
          >
            Browse Courses
          </Link>
          <Link
            href="/learn/pdfs"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to PDF Library
          </Link>
        </div>
      </div>
    </div>
  );
}
