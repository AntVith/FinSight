import type { Transaction } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface MoneyFlowSparkRibbonProperties {
  transactions: Transaction[] | null | undefined
}

interface FlowAggregateTotals {
  cumulativeMoneyIn: number
  cumulativeMoneyOut: number
  inflowEntryCount: number
  outflowEntryCount: number
}

const deriveBidirectionalFlowAggregates = (
  transactionsListReadonly: Transaction[]
): FlowAggregateTotals => {
  let cumulativeMoneyIn = 0
  let cumulativeMoneyOut = 0
  let inflowEntryCount = 0
  let outflowEntryCount = 0
  transactionsListReadonly.forEach((row) => {
    if (row.Amount < 0) {
      cumulativeMoneyIn += Math.abs(row.Amount)
      inflowEntryCount += 1
    } else if (row.Amount > 0) {
      cumulativeMoneyOut += row.Amount
      outflowEntryCount += 1
    }
  })
  return { cumulativeMoneyIn, cumulativeMoneyOut, inflowEntryCount, outflowEntryCount }
}

export const MoneyFlowSparkRibbon = ({ transactions }: MoneyFlowSparkRibbonProperties) => {
  const safeLedger = Array.isArray(transactions) ? transactions : []
  const {
    cumulativeMoneyIn,
    cumulativeMoneyOut,
    inflowEntryCount,
    outflowEntryCount,
  } = deriveBidirectionalFlowAggregates(safeLedger)

  if (cumulativeMoneyIn === 0 && cumulativeMoneyOut === 0) {
    return null
  }

  const netRetainedDelta = cumulativeMoneyIn - cumulativeMoneyOut
  const peakRailScalar = Math.max(cumulativeMoneyIn, cumulativeMoneyOut, 1)
  const inflowProportionPercent = Math.max(4, Math.round((cumulativeMoneyIn / peakRailScalar) * 100))
  const outflowProportionPercent = Math.max(4, Math.round((cumulativeMoneyOut / peakRailScalar) * 100))
  const retentionRatePercent =
    cumulativeMoneyIn > 0
      ? Math.max(0, Math.round((netRetainedDelta / cumulativeMoneyIn) * 100))
      : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-1 gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Money flow</h2>
        <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
          Period totals
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
        Inflows versus outflows for the active sync window, scaled relative to the larger side.
      </p>

      <div className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-center gap-2">
              <span aria-hidden className="grid place-items-center w-5 h-5 rounded-md bg-emerald-500/15">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 font-semibold">
                Money in
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                · {inflowEntryCount} deposit{inflowEntryCount === 1 ? '' : 's'}
              </span>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(cumulativeMoneyIn)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-700"
              style={{ width: `${inflowProportionPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-center gap-2">
              <span aria-hidden className="grid place-items-center w-5 h-5 rounded-md bg-rose-500/15">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600 dark:text-rose-400">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-rose-700 dark:text-rose-400 font-semibold">
                Money out
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                · {outflowEntryCount} charge{outflowEntryCount === 1 ? '' : 's'}
              </span>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              -{formatCurrency(cumulativeMoneyOut)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-rose-500 to-red-500 transition-all duration-700"
              style={{ width: `${outflowProportionPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="block text-[10px] uppercase tracking-[0.25em] font-semibold text-gray-500 dark:text-gray-400">
            Net retained
          </span>
          {cumulativeMoneyIn > 0 && (
            <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              {retentionRatePercent}% of inflows held
            </span>
          )}
        </div>
        <span
          className={`text-xl font-bold font-mono tabular-nums ${
            netRetainedDelta >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {netRetainedDelta >= 0 ? '+' : ''}
          {formatCurrency(netRetainedDelta)}
        </span>
      </div>
    </div>
  )
}
