export default function LiveClassesLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <div className="h-7 bg-gray-200 rounded-lg w-44 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-72 animate-pulse" />
      </div>

      {["Upcoming Classes", "Past Classes"].map((label) => (
        <section key={label}>
          <div className="h-5 bg-gray-200 rounded w-36 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-100" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-20 bg-gray-200 rounded-full" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                  <div className="h-9 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
