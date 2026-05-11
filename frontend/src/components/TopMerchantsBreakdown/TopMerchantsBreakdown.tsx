import type { Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface TopMerchantsBreakdownProperties {
  transactions: Transaction[] | null | undefined
  maxRowsRendered?: number
}

interface MerchantAggregateRow {
  merchantName: string
  totalOutflow: number
  transactionCount: number
  lastSeenIsoDay: string
}

const deriveTopMerchantsByOutflow = (
  transactionsListReadonly: Transaction[],
  maxRowsRendered: number
): { topRows: MerchantAggregateRow[]; totalOutflow: number } => {
  const runningMap = new Map<string, MerchantAggregateRow>()
  let totalOutflow = 0

  transactionsListReadonly.forEach((row) => {
    if (!(row.Amount > 0)) {
      return
    }
    totalOutflow += row.Amount
    const merchantLabel = row.MerchantName?.trim() || row.Name?.trim() || 'Unknown'
    const prior = runningMap.get(merchantLabel) ?? {
      merchantName: merchantLabel,
      totalOutflow: 0,
      transactionCount: 0,
      lastSeenIsoDay: '',
    }
    prior.totalOutflow += row.Amount
    prior.transactionCount += 1
    const daySlice = typeof row.Date === 'string' ? row.Date.slice(0, 10) : ''
    if (daySlice && daySlice.localeCompare(prior.lastSeenIsoDay) > 0) {
      prior.lastSeenIsoDay = daySlice
    }
    runningMap.set(merchantLabel, prior)
  })

  const topRows = [...runningMap.values()]
    .sort((leftHand, rightHand) => rightHand.totalOutflow - leftHand.totalOutflow)
    .slice(0, maxRowsRendered)

  return { topRows, totalOutflow }
}

const formatRelativeDayPhrase = (isoDay: string): string => {
  if (!isoDay) {
    return ''
  }
  const todayUtcLexical = new Date().toISOString().slice(0, 10)
  if (isoDay === todayUtcLexical) {
    return 'today'
  }
  const seenStamp = Date.parse(`${isoDay}T00:00:00Z`)
  if (Number.isNaN(seenStamp)) {
    return ''
  }
  const daysAgo = Math.max(0, Math.round((Date.now() - seenStamp) / 86_400_000))
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return 'yesterday'
  if (daysAgo < 7) return `${daysAgo}d ago`
  if (daysAgo < 30) return `${Math.round(daysAgo / 7)}w ago`
  return `${Math.round(daysAgo / 30)}mo ago`
}

export const TopMerchantsBreakdown = ({
  transactions,
  maxRowsRendered = 5,
}: TopMerchantsBreakdownProperties) => {
  const safeLedger = Array.isArray(transactions) ? transactions : []
  const { topRows, totalOutflow } = deriveTopMerchantsByOutflow(safeLedger, maxRowsRendered)

  if (topRows.length === 0) {
    return null
  }

  const peakOutflow = topRows[0]?.totalOutflow ?? 1
  const topConcentrationOutflow = topRows.reduce((sum, row) => sum + row.totalOutflow, 0)
  const concentrationPercent =
    totalOutflow > 0 ? Math.round((topConcentrationOutflow / totalOutflow) * 100) : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-1 gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Top merchants</h2>
        <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
          By outflow
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        These {topRows.length} merchants capture{' '}
        <span className="font-semibold text-brand-700 dark:text-brand-300">
          {concentrationPercent}%
        </span>{' '}
        of your total outflow, where attention pays the highest dividend.
      </p>

      <ul className="space-y-4">
        {topRows.map((row, rowIndex) => {
          const proportion = peakOutflow > 0 ? row.totalOutflow / peakOutflow : 0
          const widthPercent = Math.max(8, Math.round(proportion * 100))
          const lastSeenPhrase = formatRelativeDayPhrase(row.lastSeenIsoDay)
          return (
            <li key={row.merchantName}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="grid place-items-center w-6 h-6 rounded-md bg-gradient-to-br from-brand-500/15 to-purple-500/10 text-[10px] font-semibold text-brand-700 dark:text-brand-300 shrink-0"
                  >
                    {rowIndex + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {row.merchantName}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    · {row.transactionCount} tx
                    {lastSeenPhrase && ` · ${lastSeenPhrase}`}
                  </span>
                </div>
                <span className="text-sm font-semibold font-mono tabular-nums text-gray-900 dark:text-gray-50 shrink-0">
                  {formatCurrency(row.totalOutflow)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-600 to-purple-600 transition-all duration-700"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
