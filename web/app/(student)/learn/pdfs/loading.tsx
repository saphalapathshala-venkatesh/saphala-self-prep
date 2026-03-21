export default function PdfsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="h-7 bg-gray-200 rounded-lg w-44 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-60 animate-pulse" />
      <div className="space-y-3 pt-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
            <div className="w-24 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
