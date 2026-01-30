export const FeatureCards = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 flex flex-col items-start">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-6">📚</div>
          <h3 className="text-2xl font-bold text-[#2D1B69] mb-4">Self-Prep Module</h3>
          <p className="text-gray-600 mb-6">Comprehensive study material including PDFs, cheat sheets, and topic-specific tests designed for self-paced learning.</p>
          <ul className="space-y-3 mb-8 w-full">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Read-only access to premium material
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Downloadable PDF resources
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Topic-based practice tests
            </li>
          </ul>
          <button className="btn-glossy-primary mt-auto">Access Modules</button>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-purple-100 flex flex-col items-start">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-6">🎯</div>
          <h3 className="text-2xl font-bold text-[#2D1B69] mb-4">Saphala TestHub Simulator</h3>
          <p className="text-gray-600 mb-6">Real-world exam simulator with topic, subject, and grand tests to build your confidence and speed.</p>
          <ul className="space-y-3 mb-8 w-full">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Realistic exam environment
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Comprehensive grand tests
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-500 font-bold">✓</span> Detailed performance analytics
            </li>
          </ul>
          <button className="btn-glossy-primary mt-auto">Start Simulator</button>
        </div>
      </div>
    </section>
  );
};
