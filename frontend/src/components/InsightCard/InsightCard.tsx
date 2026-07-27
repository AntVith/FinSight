import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Insight } from '../../types'
import { formatCategoryName, formatCurrency, formatDisplayedCalendarDateMedium } from '../../utils/formatters'

interface Props {
  insight: Insight
}

export const InsightCard = ({ insight }: Props) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          AI Financial Insights
        </h2>
        <time
          dateTime={insight.UpdatedAt}
          className="text-xs text-gray-400 dark:text-gray-500 shrink-0 pt-1"
        >
          Updated {formatDisplayedCalendarDateMedium(insight.UpdatedAt)}
        </time>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-gray-700 dark:text-gray-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.Summary}</ReactMarkdown>
      </div>

      {insight.TopCategories.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2.5 mb-3">
            <span aria-hidden className="block w-1 h-4 rounded-full bg-gradient-to-b from-brand-500 to-purple-500" />
            <span className="text-[13px] font-bold tracking-[0.2em] uppercase text-gray-800 dark:text-gray-100">
              Top spending categories
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {insight.TopCategories.map((cat) => (
              <div
                key={cat.category}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatCategoryName(cat.category)}</p>
                <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                  {formatCurrency(cat.total_amount)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{cat.count} transactions</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insight.Recommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2.5 mb-3">
            <span aria-hidden className="block w-1 h-4 rounded-full bg-gradient-to-b from-brand-500 to-purple-500" />
            <span className="text-[13px] font-bold tracking-[0.2em] uppercase text-gray-800 dark:text-gray-100">
              Recommendations
            </span>
          </h3>
          <ol className="space-y-1 list-decimal list-inside">
            {insight.Recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                {rec}
              </li>
            ))}
          </ol>
        </div>
      )}

      {insight.Anomalies.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2.5 mb-3">
            <span aria-hidden className="block w-1 h-4 rounded-full bg-gradient-to-b from-rose-500 to-red-500" />
            <span className="text-[13px] font-bold tracking-[0.2em] uppercase text-gray-800 dark:text-gray-100">
              Anomalies
            </span>
          </h3>
          <div className="space-y-2">
            {insight.Anomalies.map((anomaly, i) => (
              <div
                key={i}
                className="flex justify-between items-start bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{anomaly.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{anomaly.reason}</p>
                </div>
                <span className="text-sm font-semibold text-red-500 ml-2 shrink-0">
                  {formatCurrency(anomaly.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
