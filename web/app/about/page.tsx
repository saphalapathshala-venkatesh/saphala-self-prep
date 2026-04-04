import { Header } from '@/ui-core/Header';
import { Footer } from '@/ui-core/Footer';

export default function AboutPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-white py-20 flex-grow">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold text-[#2D1B69] mb-8">About Saphala Pathshala</h1>
          <div className="prose prose-lg text-gray-600 max-w-none space-y-6">
            <p>
              Saphala Pathshala is more than just an educational platform; it's a dedicated partner in your academic success. Founded by educators and technologists, we understand the challenges students face in today's competitive environment.
            </p>
            <h2 className="text-2xl font-bold text-[#2D1B69] mt-12 mb-4">Our Mission</h2>
            <p>
              To democratize high-quality education by providing accessible, self-paced learning tools that empower students to master complex subjects and excel in high-stakes examinations.
            </p>
            <h2 className="text-2xl font-bold text-[#2D1B69] mt-12 mb-4">The Saphala Advantage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-purple-50 p-6 rounded-xl">
                <h3 className="font-bold text-[#2D1B69] mb-2 text-lg">Expert-Curated Content</h3>
                <p>Every module and test is designed by subject matter experts to ensure accuracy and relevance.</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-xl">
                <h3 className="font-bold text-[#2D1B69] mb-2 text-lg">Realistic Simulation</h3>
                <p>Our TestHub Simulator replicates actual exam conditions to build stamina and confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
