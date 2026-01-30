import { Header } from "@/ui-core/Header";
import { Footer } from "@/ui-core/Footer";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-gray-50 py-20 flex-grow">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-4 text-center">
              Contact Us
            </h1>
            <p className="text-gray-600 mb-8 text-center">
              Have questions? We&apos;re here to help you on your learning journey.
            </p>

            <ContactForm />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
