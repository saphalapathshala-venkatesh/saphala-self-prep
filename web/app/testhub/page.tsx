import { getActiveCourses, getEnrolledCourses, getEnrolledValidityMap } from "@/lib/courseDb";
import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatRupeesINR(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default async function TestHubPage() {
  const user = await getCurrentUser();

  const [courses, enrolledCourses] = await Promise.all([
    getActiveCourses({ testHubOnly: true, limit: 100 }),
    user ? getEnrolledCourses(user.id) : Promise.resolve([]),
  ]);

  const enrolledSet = new Set(enrolledCourses.map((c) => c.id));

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="bg-white py-12 border-b border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-3">TestHub</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Simulated tests that feel like the real exam. Choose a test series and start practicing.
          </p>
        </div>
      </section>

      {/* Course grid */}
      <section className="container mx-auto px-4 py-10 flex-grow">
        {courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No test series available yet.</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isEnrolled = enrolledSet.has(course.id);
              const isFree = course.isFree || course.productCategory === "FREE_DEMO";
              const hasPricing = !isFree && course.sellingPrice != null && Number(course.sellingPrice) > 0;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-[#6D4BCB] hover:shadow-md transition-all duration-150"
                >
                  {/* Thumbnail or gradient banner */}
                  {course.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={course.thumbnailUrl}
                      alt={course.name}
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-[#2D1B69] via-[#4A2E9E] to-[#6D4BCB] flex items-center justify-center px-4">
                      <span className="text-white font-bold text-sm text-center leading-snug line-clamp-2 opacity-90">
                        {course.name}
                      </span>
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-grow">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {isFree && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Free
                        </span>
                      )}
                      {!isFree && isEnrolled && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Enrolled
                        </span>
                      )}
                      {!isFree && !isEnrolled && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                          Premium
                        </span>
                      )}
                      {course.categoryName && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          {course.categoryName}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-[#2D1B69] leading-snug line-clamp-2 mb-2 flex-grow">
                      {course.name}
                    </h3>

                    {/* Description */}
                    {course.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    )}

                    {/* Footer row */}
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      {hasPricing && !isEnrolled ? (
                        <>
                          <span className="text-base font-bold text-[#2D1B69]">
                            {formatRupeesINR(Number(course.sellingPrice!))}
                          </span>
                          <span className="text-xs font-semibold text-[#6D4BCB] group-hover:underline">
                            View Course →
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-[#6D4BCB] group-hover:underline ml-auto">
                          {isEnrolled ? "Open Course →" : "View Course →"}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
