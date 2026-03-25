import { getPublishedPdfs } from "@/lib/contentDb";
import LearnPageShell from "@/components/learn/LearnPageShell";
import { PRODUCTS, ROUTES } from "@/config/terminology";
import { getSubjectColor, colorTokens } from "@/lib/subjectColor";
import { parseCourseContext, courseReturnUrl } from "@/lib/courseNav";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function Breadcrumb({
  category, subject, topic, subtopic,
}: {
  category: string | null; subject: string | null; topic: string | null; subtopic: string | null;
}) {
  const parts = [category, subject, topic, subtopic].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <p className="text-[10px] text-gray-400 truncate" title={parts.join(" › ")}>
      {parts.join(" › ")}
    </p>
  );
}

export default async function PdfsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [pdfs, sp] = await Promise.all([getPublishedPdfs(), searchParams]);
  const ctx = parseCourseContext(sp);
  const backHref = ctx ? courseReturnUrl(ctx) : ROUTES.dashboard;

  return (
    <LearnPageShell
      productLabel={PRODUCTS.contentLibrary}
      title={PRODUCTS.pdfs}
      description="Download and study curated PDFs for your exam preparation."
      backHref={backHref}
    >
      {pdfs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <p className="text-gray-400 font-medium mb-1">No PDFs published yet</p>
          <p className="text-gray-400 text-sm">
            Study materials are being prepared. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pdfs.map((pdf) => {
            const color = getSubjectColor(pdf.subjectColor, pdf.breadcrumb.subject);
            const tokens = colorTokens(color);
            return (
              <div
                key={pdf.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3"
                style={{ borderLeftColor: tokens.border, borderLeftWidth: 3 }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tokens.bg }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: tokens.icon }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <Breadcrumb {...pdf.breadcrumb} />
                  <h3 className="font-semibold text-[#2D1B69] text-sm leading-snug line-clamp-2">
                    {pdf.title}
                  </h3>
                  {pdf.fileSize != null && (
                    <p className="text-[10px] text-gray-400">{formatSize(pdf.fileSize)}</p>
                  )}
                  <div className="mt-auto pt-2">
                    <a
                      href={pdf.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-75 transition-opacity"
                      style={{ color: tokens.icon }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LearnPageShell>
  );
}
