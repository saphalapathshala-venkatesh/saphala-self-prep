import Link from 'next/link';
import { Header } from '@/ui-core/Header';
import { Footer } from '@/ui-core/Footer';
import { BannerCarousel } from '@/ui-core/BannerCarousel';
import { FeatureCards } from '@/ui-core/FeatureCards';
import { CourseCarousel } from '@/ui-core/CourseCarousel';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white py-20 border-b border-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-[#2D1B69] mb-6 leading-tight">
            Master Your Studies with <br /> Professional Self-Prep
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            The most comprehensive learning platform for students who want to excel. 
            Access premium modules and state-of-the-art simulators today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-glossy-primary">Create Free Account</Link>
            <Link href="/courses" className="btn-glossy-secondary">Explore Courses</Link>
          </div>
        </div>
      </section>

      <BannerCarousel />
      
      <FeatureCards />
      
      <CourseCarousel />

      <div className="flex-grow" />
      <Footer />
    </main>
  );
}
