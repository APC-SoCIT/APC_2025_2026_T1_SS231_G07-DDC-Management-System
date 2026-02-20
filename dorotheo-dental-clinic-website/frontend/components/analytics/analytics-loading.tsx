"use client"

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-10 bg-gray-200 rounded-md" />
          ))}
        </div>
      </div>

      {/* Date range skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>

      {/* Tab switcher skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-28 bg-gray-200 rounded-md" />
        ))}
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200 min-h-[140px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-lg" />
              <div className="h-4 w-16 bg-gray-300 rounded" />
            </div>
            <div>
              <div className="h-8 w-32 bg-gray-300 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Full-width chart skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 w-40 bg-gray-200 rounded mb-1" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="p-6">
          <div className="h-[300px] bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Two-column chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="h-6 w-36 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-48 bg-gray-100 rounded" />
            </div>
            <div className="p-6">
              <div className="h-[300px] bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Another two-column chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="h-6 w-36 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-48 bg-gray-100 rounded" />
            </div>
            <div className="p-6">
              <div className="h-[300px] bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
