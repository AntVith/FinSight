interface SkeletonPaneProperties {
  /** Subtitle shown under the pulsating placeholders (e.g. while awaiting refreshed AI output). */
  supportingStatusLabel?: string
}

export const InsightRegionalSkeletonFence = ({
  supportingStatusLabel = 'Refreshing AI insights…',
}: SkeletonPaneProperties) => (
  <div
    aria-busy="true"
    className="bg-white dark:bg-gray-950 rounded-[1.65rem] border border-brand-600/15 dark:border-gray-700 p-8 h-full backdrop-blur-sm"
    role="status"
  >
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-2">
          AI Financial Insights
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{supportingStatusLabel}</p>
      </div>
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-40" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-600" />
      </span>
    </div>

    <div className="space-y-3 mb-8">
      <div className="h-4 w-full rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
      <div className="h-4 w-[92%] rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
      <div className="h-4 w-[88%] rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
    </div>

    <div className="grid grid-cols-2 gap-3 mb-10">
      {Array.from({ length: 4 }).map((_, rowIndexPlaceholder) => (
        <div
          key={`skeleton-mini-kpi-${rowIndexPlaceholder}`}
          className="h-28 rounded-2xl bg-gray-50 dark:bg-gray-900 animate-pulse"
        />
      ))}
    </div>

    <div className="h-44 rounded-3xl bg-gradient-to-br from-brand-600/15 via-purple-600/15 to-transparent dark:from-brand-500/40 dark:to-gray-950 animate-pulse" />
  </div>
)
