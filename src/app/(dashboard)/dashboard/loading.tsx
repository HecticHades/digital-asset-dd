export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="h-4 w-32 bg-void-800 rounded animate-pulse mb-2" />
          <div className="h-10 w-64 bg-void-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-void-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card">
            <div className="h-5 w-5 bg-void-800 rounded mb-4 animate-pulse" />
            <div className="h-4 w-24 bg-void-800 rounded mb-2 animate-pulse" />
            <div className="h-8 w-16 bg-void-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="h-6 w-32 bg-void-800 rounded mb-6 animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-void-800 rounded animate-pulse" />
                  <div className="h-4 w-8 bg-void-800 rounded animate-pulse" />
                </div>
                <div className="h-2 bg-void-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <div className="h-6 w-32 bg-void-800 rounded mb-6 animate-pulse" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <div className="h-8 w-8 bg-void-800 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-void-800 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-48 bg-void-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
