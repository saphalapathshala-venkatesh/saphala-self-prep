import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import { getActiveCourses, getExamsForCategory, getCachedCategories } from "@/lib/courseDb";
import CoursesClient from "@/components/courses/CoursesClient";
import type { CategoryExams } from "@/components/courses/CoursesClient";

// force-dynamic is required because we read searchParams for initial filter state
// (pre-applies the filter from the URL on first load / deep links).
// All DB queries go through unstable_cache (60 s TTL) so the data itself is cached.
// Filter interactions after the initial load are entirely client-side — instant.
export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; exam?: string; productCategory?: string }>;
}) {
  const sp = await searchParams;
  const initialCategory        = sp.category        ?? null;
  const initialExam            = sp.exam            ?? null;
  const initialProductCategory = sp.productCategory ?? null;

  // Fetch ALL courses + ALL categories in parallel (no filters — client handles them).
  const [allCourses, categories] = await Promise.all([
    getActiveCourses({ limit: 200 }),
    getCachedCategories(),
  ]);

  // Fetch exams for every category in parallel so the client can show exam pills
  // instantly when the user switches categories.
  const examsByCategory: CategoryExams[] = await Promise.all(
    categories.map(async (cat) => ({
      categoryId: cat.id,
      exams: await getExamsForCategory(cat.id),
    }))
  );

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <CoursesClient
        allCourses={allCourses}
        categories={categories}
        examsByCategory={examsByCategory}
        initialCategory={initialCategory}
        initialExam={initialExam}
        initialProductCategory={initialProductCategory}
      />

      <Footer />
    </main>
  );
}
