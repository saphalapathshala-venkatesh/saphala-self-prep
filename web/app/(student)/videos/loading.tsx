export default function VideosLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div className="h-7 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-72 animate-pulse" />
      </div>
      <section>
        <div className="h-5 bg-gray-200 rounded w-36 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
