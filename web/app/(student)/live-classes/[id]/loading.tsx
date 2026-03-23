export default function LiveClassDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40" />
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-40 bg-gray-100" />
        <div className="p-6 space-y-4">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-20 bg-gray-50 rounded-xl" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
