import { Header } from '@/ui-core/Header';
import { Footer } from '@/ui-core/Footer';
import { FeatureCards } from '@/ui-core/FeatureCards';

export default function ProductsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-gray-50 py-20 flex-grow">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl font-bold text-[#2D1B69] mb-4">Our Products</h1>
            <p className="text-gray-600 text-lg">
              Empowering students with specialized tools for every stage of their academic journey.
            </p>
          </div>
          <FeatureCards />
        </div>
      </div>
      <Footer />
    </main>
  );
}
