export default function FlashcardsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="h-7 bg-gray-200 rounded-lg w-48 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-72 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
            <div className="h-9 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
