import Link from "next/link";

interface CourseCard {
  id: string;
  title: string;
  exam: string;
  examColor: string;
  type: string;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  href: string;
}

// Exam-oriented placeholder cards — replace with real DB data when available
const FEATURED_COURSES: CourseCard[] = [
  {
    id: "c1",
    title: "APPSC Group-1 Complete Prep Pack",
    exam: "APPSC",
    examColor: "bg-purple-100 text-purple-700",
    type: "Complete Pack",
    price: 1499,
    originalPrice: 2499,
    thumbnail: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=600&h=338",
    href: "/courses/appsc-group1-complete",
  },
  {
    id: "c2",
    title: "APPSC Group-2 Video Course",
    exam: "APPSC",
    examColor: "bg-purple-100 text-purple-700",
    type: "Video Course",
    price: 999,
    originalPrice: 1599,
    thumbnail: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600&h=338",
    href: "/courses/appsc-group2-video",
  },
  {
    id: "c3",
    title: "AP Police Constable Test Series",
    exam: "AP Police",
    examColor: "bg-blue-100 text-blue-700",
    type: "Test Series",
    price: 399,
    originalPrice: 699,
    thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=600&h=338",
    href: "/testhub",
  },
  {
    id: "c4",
    title: "Banking & SSC Current Affairs Pack",
    exam: "Banking",
    examColor: "bg-green-100 text-green-700",
    type: "Current Affairs",
    price: 299,
    thumbnail: "https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=600&h=338",
    href: "/courses/banking-current-affairs",
  },
];

function formatPrice(paise: number): string {
  return `₹${paise.toLocaleString("en-IN")}`;
}

export default function FeaturedCoursesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#2D1B69] mb-2">
              Featured Courses
            </h2>
            <p className="text-gray-500">
              Hand-picked preparation bundles for top competitive exams.
            </p>
          </div>
          <Link
            href="/courses"
            className="text-sm font-semibold text-[#6D4BCB] hover:underline shrink-0 ml-4"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_COURSES.map((course) => (
            <div
              key={course.id}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col"
            >
              {/* Thumbnail (16:9) */}
              <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                  className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${course.examColor}`}
                >
                  {course.exam}
                </span>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  {course.type}
                </span>
                <h3 className="text-sm font-bold text-[#2D1B69] mb-3 leading-snug flex-1">
                  {course.title}
                </h3>

                <div className="flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-lg font-bold text-[#2D1B69]">
                      {formatPrice(course.price)}
                    </span>
                    {course.originalPrice && (
                      <span className="text-xs text-gray-400 line-through ml-1.5">
                        {formatPrice(course.originalPrice)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={course.href}
                    className="text-xs font-semibold bg-[#6D4BCB] text-white px-3 py-1.5 rounded-full hover:bg-[#5E3FB8] transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Login required to access course content.{" "}
          <Link href="/register" className="text-[#6D4BCB] hover:underline font-medium">
            Create a free account →
          </Link>
        </p>
      </div>
    </section>
  );
}
