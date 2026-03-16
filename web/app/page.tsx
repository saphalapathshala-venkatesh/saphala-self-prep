// The homepage fetches live DB data (featured courses) — must be dynamic.
// Without this, Next.js tries to statically prerender it at build time,
// which fails because DATABASE_URL is unavailable in the build environment.
export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import QuoteKalamStrip from "@/components/home/QuoteKalamStrip";
import HeroSlider from "@/components/home/HeroSlider";
import ExamCategoriesSection from "@/components/home/ExamCategoriesSection";
import ProductTypesSection from "@/components/home/ProductTypesSection";
import FeaturedCoursesSection from "@/components/home/FeaturedCoursesSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import ContactForm from "@/components/home/ContactForm";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* 1. Navbar */}
      <Header />

      {/* 2. Quote + Kalam Dedication Strip */}
      <QuoteKalamStrip />

      {/* 3. Hero Slider */}
      <HeroSlider />

      {/* 4. Exam Categories — DB-driven via /api/public/categories */}
      <ExamCategoriesSection />

      {/* 5. Product Types / Learning Approaches */}
      <ProductTypesSection />

      {/* 6. Featured Courses — DB-driven via Prisma */}
      <FeaturedCoursesSection />

      {/* 7. Platform Features */}
      <FeaturesSection />

      {/* 8. Contact Form — submits to /api/public/contact */}
      <ContactForm />

      {/* 9. Footer */}
      <Footer />
    </main>
  );
}
