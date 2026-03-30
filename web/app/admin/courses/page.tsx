import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/db";
import AdminCourseThumbnailEditor from "./AdminCourseThumbnailEditor";

export const dynamic = "force-dynamic";

const PRODUCT_LABEL: Record<string, string> = {
  FREE_DEMO:          "Free Demo",
  COMPLETE_PREP_PACK: "Complete Pack",
  VIDEO_ONLY:         "Video Only",
  SELF_PREP:          "Self Prep",
  PDF_ONLY:           "PDF Only",
  TEST_SERIES:        "Test Series",
  FLASHCARDS_ONLY:    "Flashcards",
  CURRENT_AFFAIRS:    "Current Affairs",
};

type CourseRow = {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  productCategory: string;
  categoryName: string | null;
  examName: string | null;
  isFree: boolean;
  isActive: boolean;
};

export default async function AdminCoursesPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN"]);

  const courses = await prisma.$queryRawUnsafe<CourseRow[]>(`
    SELECT
      c.id,
      c.name,
      c."thumbnailUrl",
      c."productCategory",
      cat.name AS "categoryName",
      e.name   AS "examName",
      COALESCE(c."isFree", false) AS "isFree",
      c."isActive"
    FROM "Course" c
    LEFT JOIN "Category" cat ON cat.id = c."categoryId"
    LEFT JOIN "Exam"     e   ON e.id   = c."examId"
    WHERE c."isActive" = true
    ORDER BY c."createdAt" DESC
    LIMIT 200
  `);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1B69]">Course Thumbnails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set or update the thumbnail URL for each course. Paste any direct image link (JPG, PNG, WebP).
          The preview updates as you type. Base64 images are not shown in the catalog — use an external URL for best results.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <strong>Tip:</strong> Use direct image URLs — YouTube thumbnails, Google Drive direct links, Cloudinary, or Bunny CDN work great. Avoid Google Docs sharing links.
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No active courses found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {courses.map((course) => {
            const isBase64 = course.thumbnailUrl?.startsWith("data:") ?? false;
            return (
              <div key={course.id} className="p-5 flex gap-5 items-start">
                {/* Current thumbnail preview (small) */}
                <div className="shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {course.thumbnailUrl && !isBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#2D1B69] to-[#6D4BCB] flex items-center justify-center p-1">
                      {isBase64 ? (
                        <span className="text-[8px] text-white/80 text-center leading-tight">Base64 (not shown in catalog)</span>
                      ) : (
                        <span className="text-[8px] text-white/60 text-center leading-tight">No thumbnail</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Course info + editor */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-bold text-[#2D1B69] leading-tight">{course.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {PRODUCT_LABEL[course.productCategory] ?? course.productCategory}
                      </span>
                      {course.categoryName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          {course.categoryName}
                        </span>
                      )}
                      {course.examName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          {course.examName}
                        </span>
                      )}
                      {course.isFree && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Free
                        </span>
                      )}
                      {isBase64 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          ⚠ Base64 thumbnail — replace with URL
                        </span>
                      )}
                    </div>
                  </div>

                  <AdminCourseThumbnailEditor
                    courseId={course.id}
                    initialUrl={isBase64 ? "" : (course.thumbnailUrl ?? "")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
